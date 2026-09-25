/**
 * triageController.js
 * ───────────────────
 * Controller for AI Symptom Triage + Smart Doctor Matching
 */

import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import AppointmentReview from "../models/AppointmentReview.js";
import { resolveAvailability } from "../services/availabilityService.js";
import { analyzeSymptomsWithGemini } from "../services/geminiTriageService.js";

/**
 * Finds the soonest available slot for a doctor within the next 7 days.
 */
async function findSoonestSlot(doctorId) {
  const now = new Date();
  const todayMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + i);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

    try {
      const generatedSlots = await resolveAvailability(doctorId, dateStr);
      if (!generatedSlots || !generatedSlots.length) continue;

      const bookedAppts = await Appointment.find({
        $or: [{ doctorId }, { doctor: doctorId }],
        date: dateStr,
        status: { $nin: ["cancelled", "rejected", "no-show"] }
      }).select("time").lean();

      const bookedTimes = new Set(bookedAppts.map((a) => a.time));

      for (const slot of generatedSlots) {
        const time = typeof slot === "string" ? slot : slot.startTime;
        if (!time || bookedTimes.has(time)) continue;

        // If today, ensure slot is in future
        if (i === 0) {
          const [h, m] = time.split(":").map(Number);
          if (!isNaN(h) && !isNaN(m) && (h * 60 + m) <= todayMinutes) {
            continue;
          }
        }

        return {
          date: dateStr,
          time,
          slotId: `${doctorId}|${dateStr}|${time}`,
          isToday: i === 0
        };
      }
    } catch (_) {
      // ignore date calculation errors
    }
  }

  return null;
}

export const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length < 3) {
      return res.status(400).json({ message: "Please enter your symptoms in detail (at least 3 characters)." });
    }

    // 1. Analyze symptoms with Gemini AI
    const triage = await analyzeSymptomsWithGemini(symptoms.trim());

    // 2. Query MongoDB for doctors matching this specialty
    // Prepare regex for fuzzy match e.g. "Cardiologist" or "Cardiologists"
    const baseSpecialty = triage.specialty
      .replace(/s$/i, "") // strip trailing 's'
      .trim();

    const specialtyRegex = new RegExp(baseSpecialty, "i");

    // Fetch approved doctors matching the specialty (or general physicians if none found)
    let doctors = await Doctor.find({
      status: "approved",
      specialization: specialtyRegex
    })
      .populate("user", "name email profileImage mobileNumber")
      .lean();

    // Fallback: if no doctor matches exact specialty, get general physicians
    if (!doctors.length) {
      doctors = await Doctor.find({
        status: "approved",
        specialization: /general|physician|internal/i
      })
        .populate("user", "name email profileImage mobileNumber")
        .lean();
    }

    // Fallback 2: if still no doctors, get any approved doctors
    if (!doctors.length) {
      doctors = await Doctor.find({ status: "approved" })
        .populate("user", "name email profileImage mobileNumber")
        .limit(5)
        .lean();
    }

    // 3. For each doctor, compute ratings and soonest available slot
    const enrichedDoctors = await Promise.all(
      doctors.map(async (doc) => {
        const reviews = await AppointmentReview.find({ doctorId: doc._id }).select("rating").lean();
        const avgRating = reviews.length
          ? (reviews.reduce((acc, r) => acc + (r?.rating || 0), 0) / reviews.length).toFixed(1)
          : "5.0";

        const soonestSlot = await findSoonestSlot(doc._id);

        return {
          _id: doc._id,
          name: doc.user?.name || "Dr. Specialist",
          email: doc.user?.email || "",
          profileImage: doc.user?.profileImage || doc.profileImage || "",
          specialization: doc.specialization || triage.specialty,
          medicalQualification: doc.medicalQualification || "MBBS, MD",
          yearsOfExperience: doc.yearsOfExperience || doc.experience || 5,
          hospitalClinicName: doc.hospitalClinicName || "City Care Hospital",
          fees: doc.fees || doc.consultationFeesOnline || 500,
          averageRating: parseFloat(avgRating),
          reviewCount: reviews.length,
          soonestSlot
        };
      })
    );

    // 4. Rank doctors: Highest rating first, then soonest available slot
    enrichedDoctors.sort((a, b) => {
      // If one has a slot today and the other doesn't
      if (a.soonestSlot?.isToday && !b.soonestSlot?.isToday) return -1;
      if (!a.soonestSlot?.isToday && b.soonestSlot?.isToday) return 1;

      // Higher rating first
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }

      // If both have soonestSlot, compare dates
      if (a.soonestSlot && b.soonestSlot) {
        const aKey = `${a.soonestSlot.date} ${a.soonestSlot.time}`;
        const bKey = `${b.soonestSlot.date} ${b.soonestSlot.time}`;
        return aKey.localeCompare(bKey);
      }

      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });

    res.json({
      symptoms: symptoms.trim(),
      triage,
      matchedDoctors: enrichedDoctors
    });
  } catch (error) {
    console.error("[triageController] Error:", error.message);
    res.status(500).json({ message: "Failed to complete AI triage analysis", error: error.message });
  }
};
