import PatientVital from "../models/PatientVital.js";
import User from "../models/User.js";
import { calculatePatientVitalsTrend, generatePreConsultAIBrief } from "../services/vitalsService.js";

/**
 * Record a new vitals entry (patient or doctor)
 */
export const recordVital = async (req, res) => {
  try {
    const { systolic, diastolic, bloodSugar, weight, pulse, notes, recordedAt } = req.body;

    // Patient logs for themselves; doctors can specify patientId
    const patientId = req.user.role === "doctor" && req.body.patientId
      ? req.body.patientId
      : req.user._id;

    if (!systolic || !diastolic) {
      return res.status(400).json({ message: "Systolic and Diastolic blood pressure are required" });
    }

    const numSystolic = Number(systolic);
    const numDiastolic = Number(diastolic);

    if (isNaN(numSystolic) || numSystolic < 50 || numSystolic > 260) {
      return res.status(400).json({ message: "Systolic blood pressure must be between 50 and 260 mmHg" });
    }

    if (isNaN(numDiastolic) || numDiastolic < 30 || numDiastolic > 180) {
      return res.status(400).json({ message: "Diastolic blood pressure must be between 30 and 180 mmHg" });
    }

    const vital = await PatientVital.create({
      patientId,
      systolic: numSystolic,
      diastolic: numDiastolic,
      bloodSugar: bloodSugar !== null && bloodSugar !== undefined && bloodSugar !== "" ? Number(bloodSugar) : null,
      weight: weight !== null && weight !== undefined && weight !== "" ? Number(weight) : null,
      pulse: pulse !== null && pulse !== undefined && pulse !== "" ? Number(pulse) : null,
      notes: notes || "",
      recordedBy: req.user.role || "patient",
      recordedAt: recordedAt ? new Date(recordedAt) : new Date()
    });

    res.status(201).json({
      message: "Vitals recorded successfully",
      vital
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get logged-in patient's vitals history
 */
export const getMyVitals = async (req, res) => {
  try {
    const vitals = await PatientVital.find({ patientId: req.user._id })
      .sort({ recordedAt: 1 })
      .lean();

    const trendData = await calculatePatientVitalsTrend(req.user._id);

    res.json({
      vitals,
      trendData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get specific patient's vitals (doctor access)
 */
export const getPatientVitals = async (req, res) => {
  try {
    const { patientId } = req.params;
    const vitals = await PatientVital.find({ patientId })
      .sort({ recordedAt: 1 })
      .lean();

    const trendData = await calculatePatientVitalsTrend(patientId);

    res.json({
      vitals,
      trendData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Pre-Consult AI Brief for doctor before consultation
 */
export const getPreConsultBrief = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await User.findById(patientId).select("name medicalHistory").lean();
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const trendData = await calculatePatientVitalsTrend(patientId);
    const chronicDiseases = patient.medicalHistory?.chronicDiseases || "";

    const aiBrief = await generatePreConsultAIBrief({
      patientName: patient.name,
      trendData,
      chronicDiseases
    });

    res.json({
      patientId,
      patientName: patient.name,
      aiBrief,
      trendData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a vital record (patient can delete their own entry)
 */
export const deleteVital = async (req, res) => {
  try {
    const vital = await PatientVital.findById(req.params.id);
    if (!vital) return res.status(404).json({ message: "Vital record not found" });

    if (req.user.role === "patient" && String(vital.patientId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Unauthorized to delete this record" });
    }

    await PatientVital.findByIdAndDelete(req.params.id);
    res.json({ message: "Vital record deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
