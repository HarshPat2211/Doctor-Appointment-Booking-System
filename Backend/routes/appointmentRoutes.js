import express from "express";
import {
  bookAppointment,
  getPatientAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  getDoctorAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  getMedicalHistory,
  rebookAppointment,
  markAsArrived,
  startConsultation,
  completeConsultation,
  upsertPrescription,
  getPrescription,
  deletePrescription,
  downloadPrescriptionPdf,
  upsertDoctorNote,
  getDoctorNote,
  deleteDoctorNote,
  submitAppointmentReview,
  getPatientReminders,
  adminUpdateAppointmentStatus,
  adminCancelAppointment,
  adminDeleteAppointment,
  getAppointmentByIdAdmin
} from "../controllers/appointmentController.js";

import { protect, patientOnly, doctorOnly, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Patient actions
router.post("/book", protect, patientOnly, bookAppointment);
router.get("/my", protect, patientOnly, getPatientAppointments);
router.put("/:id/cancel", protect, patientOnly, cancelAppointment);
router.put("/:id/reschedule", protect, rescheduleAppointment);
router.put("/:id/check-in", protect, patientOnly, markAsArrived);
router.get("/my/reminders", protect, patientOnly, getPatientReminders);

// 🩺 NEW: Medical history & rebook
router.get("/medical-history", protect, patientOnly, getMedicalHistory);
router.post("/:id/rebook", protect, patientOnly, rebookAppointment);
router.post("/:id/review", protect, patientOnly, submitAppointmentReview);

// Doctor actions
router.get("/doctor", protect, doctorOnly, getDoctorAppointments);
router.put("/:id", protect, doctorOnly, updateAppointmentStatus);
router.put("/:id/start-consultation", protect, doctorOnly, startConsultation);
router.put("/:id/complete-consultation", protect, doctorOnly, completeConsultation);
router.post("/:id/prescription", protect, doctorOnly, upsertPrescription);
router.delete("/:id/prescription", protect, doctorOnly, deletePrescription);
router.post("/:id/notes", protect, doctorOnly, upsertDoctorNote);
router.get("/:id/notes", protect, doctorOnly, getDoctorNote);
router.delete("/:id/notes", protect, doctorOnly, deleteDoctorNote);

// Shared (doctor/patient/admin access checked in controller)
router.get("/:id/prescription", protect, getPrescription);
router.get("/:id/prescription/pdf", protect, downloadPrescriptionPdf);

// Admin actions
router.get("/all", protect, adminOnly, getAllAppointments);
router.put("/:id/admin-status", protect, adminOnly, adminUpdateAppointmentStatus);
router.put("/:id/admin-cancel", protect, adminOnly, adminCancelAppointment);
router.delete("/:id/admin-delete", protect, adminOnly, adminDeleteAppointment);
router.get("/:id/admin-detail", protect, adminOnly, getAppointmentByIdAdmin);

// Get single appointment (must be last to avoid conflicts)
router.get("/:id", protect, patientOnly, getAppointmentById);

export default router;
