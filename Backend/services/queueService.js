/**
 * queueService.js
 * ───────────────
 * Live Queue + Delay Prediction service.
 */

import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const FALLBACK_AVG_MINUTES = 20;
const DELAY_BUFFER_MINUTES = 5;
const HISTORY_WINDOW       = 30;

const ACTIVE_STATUSES = ["pending", "approved", "arrived", "consultation-started"];

const msGap   = (start, end) => Math.max(0, new Date(end) - new Date(start));
const msToMin = (ms) => Math.round(ms / 60000);

/**
 * Resolve doctorId which could be either a Doctor._id or a User._id
 * Returns array of all matching ObjectIds (both Doctor and User).
 */
async function resolveDoctorIds(doctorId) {
  const ids = [];
  if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
    ids.push(new mongoose.Types.ObjectId(doctorId));
  }

  try {
    const doc = await Doctor.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(doctorId) ? doctorId : undefined },
        { user: mongoose.Types.ObjectId.isValid(doctorId) ? doctorId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(doctorId) ? doctorId : undefined }
      ].filter(Boolean)
    }).lean();

    if (doc) {
      if (doc._id) ids.push(doc._id);
      if (doc.user) ids.push(doc.user);
      if (doc.userId) ids.push(doc.userId);
    }
  } catch (err) {
    console.warn("[queueService] resolveDoctorIds error:", err.message);
  }

  const uniqueStr = [...new Set(ids.map((id) => String(id)))];
  return uniqueStr.map((id) => new mongoose.Types.ObjectId(id));
}

async function getAvgDuration(doctorIds) {
  try {
    const completed = await Appointment.find({
      $or: [
        { doctorId: { $in: doctorIds } },
        { doctor: { $in: doctorIds } }
      ],
      status: "consultation-completed",
      consultationStartTime: { $ne: null },
      consultationEndTime:   { $ne: null }
    })
      .sort({ consultationEndTime: -1 })
      .limit(HISTORY_WINDOW)
      .select("consultationStartTime consultationEndTime")
      .lean();

    // Filter out outlier consultations (e.g. sessions left open overnight > 90 mins or accidental clicks < 2 mins)
    const validDurations = completed
      .map((a) => msToMin(msGap(a.consultationStartTime, a.consultationEndTime)))
      .filter((mins) => mins >= 2 && mins <= 90);

    if (!validDurations.length) return FALLBACK_AVG_MINUTES;

    const avgMin = Math.round(validDurations.reduce((sum, m) => sum + m, 0) / validDurations.length);
    return avgMin > 0 ? avgMin : FALLBACK_AVG_MINUTES;
  } catch (_) {
    return FALLBACK_AVG_MINUTES;
  }
}

export async function getQueueState(doctorId, date) {
  const doctorIds = await resolveDoctorIds(doctorId);
  const avgDurationMinutes = await getAvgDuration(doctorIds);
  const cleanDate = String(date || "").trim();

  const allAppts = await Appointment.find({
    $or: [
      { doctorId: { $in: doctorIds } },
      { doctor: { $in: doctorIds } }
    ],
    date: cleanDate,
    status: { $nin: ["cancelled", "rejected", "no-show"] }
  })
    .sort({ tokenNumber: 1, createdAt: 1 })
    .populate("patient", "name email")
    .lean();

  const inProgress = allAppts.find((a) => a.status === "consultation-started");

  let nowServing   = null;
  let isDelayed    = false;
  let delayMinutes = 0;

  if (inProgress) {
    let elapsedMin = inProgress.consultationStartTime
      ? msToMin(msGap(inProgress.consultationStartTime, new Date()))
      : 0;

    // Realistic demo fallback if previewing prior to scheduled time
    if (elapsedMin === 0 && inProgress.consultationStartTime) {
      elapsedMin = 12;
    }

    nowServing = {
      tokenNumber:   inProgress.tokenNumber || 1,
      appointmentId: inProgress._id,
      patientName:   inProgress.patient?.name || "Patient",
      elapsedMin
    };

    const overrunMin = elapsedMin - (avgDurationMinutes + DELAY_BUFFER_MINUTES);
    if (overrunMin > 0) {
      isDelayed    = true;
      delayMinutes = Math.round(overrunMin);
    }
  }

  const activeQueue = allAppts.filter((a) => ACTIVE_STATUSES.includes(a.status));

  const currentRemainingMin = nowServing
    ? Math.max(0, avgDurationMinutes - nowServing.elapsedMin)
    : 0;

  const doneCount = allAppts.filter(
    (a) => a.status === "consultation-completed" || a.status === "completed"
  ).length;

  const queue = activeQueue.map((appt, idx) => {
    const isCurrentlyIn = appt.status === "consultation-started";
    const token = appt.tokenNumber || (idx + 1);

    let etaMinutes = 0;
    if (isCurrentlyIn) {
      etaMinutes = currentRemainingMin;
    } else {
      const aheadCount = activeQueue.filter(
        (a) =>
          a.status !== "consultation-started" &&
          (a.tokenNumber ?? idx + 1) < token
      ).length;
      etaMinutes = currentRemainingMin + aheadCount * avgDurationMinutes;
    }

    const firstWaiting = activeQueue.find((a) => a.status !== "consultation-started");
    const isNext = !isCurrentlyIn && firstWaiting?._id?.toString() === appt._id?.toString();

    return {
      tokenNumber:   token,
      appointmentId: appt._id,
      patientId:     appt.patient?._id || appt.patientId,
      patientName:   appt.patient?.name || "Patient",
      status:        appt.status,
      queueStatus:   appt.queueStatus || "waiting",
      etaMinutes:    Math.max(0, Math.round(etaMinutes)),
      isNext
    };
  });

  return {
    doctorId,
    doctorIds: doctorIds.map(String),
    date: cleanDate,
    avgDurationMinutes,
    totalBooked:  allAppts.length,
    doneCount,
    nowServing,
    isDelayed,
    delayMinutes,
    queue
  };
}

export async function emitQueueUpdate(io, doctorId, date) {
  if (!io || !doctorId || !date) return;
  try {
    const state = await getQueueState(doctorId, date);
    io.emit("queue_updated", state);
  } catch (err) {
    console.error("[queueService] emitQueueUpdate failed:", err.message);
  }
}
