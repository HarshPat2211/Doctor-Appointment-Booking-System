import PDFDocument from "pdfkit";
import Appointment from "../models/Appointment.js";
import AppointmentReview from "../models/AppointmentReview.js";
import Doctor from "../models/Doctor.js";
import DoctorAvailability from "../models/DoctorAvailability.js";
import Prescription from "../models/Prescription.js";
import { parseAppointmentDateTime, hoursBetweenNowAndAppointment, isSameLocalDate } from "../utils/appointmentDateTime.js";
import { APPOINTMENT_STATUS, canTransitionStatus, isFinalizedStatus } from "../utils/appointmentStatus.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateSlots } from "../services/slotGenerator.js";
import {
  createAuditLog,
  ensureDoctorOwnsAppointment,
  findAppointmentById,
  findAppointmentForPatient,
  lockSlotOrThrow,
  releaseSlotIfExists
} from "../services/appointmentService.js";
import { getDoctorByUserId, getUserById } from "../services/userService.js";
import { emitQueueUpdate } from "../services/queueService.js";
import { evaluatePrescriptionSafety } from "../services/prescriptionSafetyService.js";

const DOSAGE_REGEX = /^\d+(\.\d+)?\s?(mg|ml|g|mcg|tab|tablet|capsule|drop|drops|units)$/i;

const logAudit = async (payload) => {
  try {
    await createAuditLog(payload);
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};

const validatePrescriptionPayload = ({ diagnosis, medicines, followUpDate }) => {
  if (!diagnosis || diagnosis.trim().length < 10) {
    return "Diagnosis must be at least 10 characters";
  }

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return "At least one medicine is required";
  }

  for (const med of medicines) {
    if (!med?.name?.trim() || !med?.dosage?.trim() || !med?.frequency?.trim() || !med?.duration?.trim()) {
      return "Medicine name, dosage, frequency and duration are required";
    }

    if (!DOSAGE_REGEX.test(String(med.dosage).trim())) {
      return "Invalid dosage format. Example: 500mg";
    }
  }

  if (followUpDate) {
    const followDate = new Date(followUpDate);
    if (Number.isNaN(followDate.getTime()) || followDate <= new Date()) {
      return "Follow-up date must be a future date";
    }
  }

  return null;
};

// 🩺 Book Appointment
export const bookAppointment = async (req, res) => {
  try {
    const { slotId } = req.body;

    if (!slotId) {
      return res.status(400).json({ message: "slotId is required" });
    }

    const [doctorIdFromSlot, dateFromSlot, startTimeFromSlot] = String(slotId).split("|");
    if (!doctorIdFromSlot || !dateFromSlot || !startTimeFromSlot) {
      return res.status(400).json({ message: "Slot unavailable or already booked" });
    }

    const availability = await DoctorAvailability.findOne({ doctorId: doctorIdFromSlot });
    // Only enforce schedule-based slot validation when a DoctorAvailability
    // document exists. Older doctors may rely solely on the legacy
    // doctor.availability field, and in that case we trust the slot token
    // and rely on double-book checks instead of rejecting every booking.
    if (availability) {
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(dateFromSlot).getDay()];
      const exception = (availability.exceptions || []).find((item) => item?.date === dateFromSlot);
      let generatedSlots = [];

      if (exception) {
        if (!exception.isUnavailable) {
          generatedSlots = generateSlots({
            startTime: exception.startTime,
            endTime: exception.endTime,
            breakEnabled: exception.hasBreak,
            breakStartTime: exception.breakStart,
            breakDuration: exception.breakDuration
          });
        }
      } else {
        const weekly = (availability.weekly || []).find((item) => item?.day === dayName && item?.isActive);
        if (weekly) {
          generatedSlots = generateSlots({
            startTime: weekly.startTime,
            endTime: weekly.endTime,
            breakEnabled: weekly.hasBreak,
            breakStartTime: weekly.breakStart,
            breakDuration: weekly.breakDuration
          });
        }
      }

      const slotCheck = generatedSlots.find((slot) => slot.startTime === startTimeFromSlot);
      if (!slotCheck) {
        return res.status(400).json({ message: "Slot unavailable or already booked" });
      }
    }

    const doubleBookCheck = await Appointment.findOne({
      doctorId: doctorIdFromSlot,
      date: dateFromSlot,
      time: startTimeFromSlot,
      status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW, APPOINTMENT_STATUS.REJECTED] }
    });

    if (doubleBookCheck) {
      return res.status(400).json({ message: "This time slot is already booked with this doctor" });
    }

    const doctor = await Doctor.findById(doctorIdFromSlot).populate("user", "name email isApproved");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (doctor.status !== "approved" || !doctor.user?.isApproved) {
      return res.status(403).json({ message: "Doctor not approved to accept appointments" });
    }

    const patient = await getUserById(req.user._id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const sameTimeExisting = await Appointment.findOne({
      patientId: req.user._id,
      date: dateFromSlot,
      time: startTimeFromSlot,
      status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.NO_SHOW] }
    });

    if (sameTimeExisting) {
      return res.status(400).json({ message: "You already have an appointment at this time." });
    }

    const slot = await lockSlotOrThrow(slotId).catch(() => null);
    if (!slot) return res.status(400).json({ message: "Slot was just booked by someone else" });

    // 🎟️ QUEUE: Count existing active appointments for same doctor+date to assign token
    const existingCount = await Appointment.countDocuments({
      $or: [{ doctorId: doctor._id }, { doctor: doctor._id }],
      date: dateFromSlot,
      status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.NO_SHOW] }
    });
    const tokenNumber = existingCount + 1;

    const appointment = await Appointment.create({
      doctorId: doctor._id,
      doctor: doctor._id,
      patientId: patient._id,
      patient: patient._id,
      slotId: slot._id,
      date: slot.date || dateFromSlot,
      time: slot.startTime || startTimeFromSlot,
      status: APPOINTMENT_STATUS.PENDING,
      fees: doctor.fees || 0,
      tokenNumber,
      queueStatus: "waiting"
    });

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "patient",
      action: "appointment-created",
      toStatus: APPOINTMENT_STATUS.PENDING
    });

    try {
      await sendEmail(
        patient.email,
        "Appointment Booked Successfully",
        `<h2>Hi ${patient.name},</h2><p>Your appointment with <b>Dr. ${doctor.user.name}</b> is booked on <b>${appointment.date}</b> at <b>${appointment.time}</b>.</p><p>Status: <b>${appointment.status}</b></p>`
      );
    } catch (e) {
      console.error("Patient email failed:", e.message);
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: "doctor",
        select: "hospitalClinicName specialization location fees profileImage",
        populate: { path: "user", select: "name email profileImage" }
      })
      .populate("patient", "name email");

    const io = req.io || req.app?.get("io");
    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id || appointment.patientId,
        doctorId: appointment.doctor?._id || appointment.doctorId
      });
    }

    res.status(201).json({ message: "Appointment booked successfully", appointment: populatedAppointment });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "This time slot was just booked by someone else" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id })
      .populate({ path: "doctor", select: "hospitalClinicName specialization location fees profileImage", populate: { path: "user", select: "name email profileImage" } })
      .populate("patient", "name email")
      .populate("prescription")
      .populate("review");

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAppointmentByIdAdmin = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({ path: "doctor", select: "hospitalClinicName specialization location fees user profileImage", populate: { path: "user", select: "name email profileImage" } })
      .populate("patient", "name email")
      .populate("prescription")
      .populate("review");

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate({ path: "doctor", select: "specialization fees user profileImage", populate: { path: "user", select: "name email profileImage" } })
      .populate("patient", "name email")
      .populate("prescription")
      .populate("review")
      .sort({ date: -1, time: -1, createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPatientReminders = async (req, res) => {
  try {
    const reminders = await Appointment.find({
      patient: req.user._id,
      status: APPOINTMENT_STATUS.APPROVED,
      "reminderHistory.0": { $exists: true }
    })
      .select("date time status reminderHistory doctor")
      .populate({ path: "doctor", select: "specialization user profileImage", populate: { path: "user", select: "name profileImage" } })
      .sort({ date: 1, time: 1 });

    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body || {};

    const appointment = await findAppointmentForPatient(req.params.id, req.user._id, [
      { path: "doctor", select: "user" },
      { path: "patient", select: "name" }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (isFinalizedStatus(appointment.status) || appointment.status === APPOINTMENT_STATUS.CONSULTATION_STARTED) {
      return res.status(400).json({ message: "Cannot edit after consultation completion or finalization" });
    }

    const hoursLeft = hoursBetweenNowAndAppointment(appointment.date, appointment.time);
    if (hoursLeft !== null && hoursLeft <= 2) {
      return res.status(400).json({ message: "Cannot cancel within 2 hours of appointment" });
    }

    const fromStatus = appointment.status;
    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    appointment.cancellationReason = String(reason || "Cancelled by patient").trim();
    appointment.cancelledBy = "patient";
    appointment.cancelledAt = new Date();
    await appointment.save();

    await releaseSlotIfExists(appointment.slotId);

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "patient",
      action: "appointment-cancelled",
      fromStatus,
      toStatus: APPOINTMENT_STATUS.CANCELLED,
      metadata: { reason: appointment.cancellationReason }
    });

    const io = req.io || req.app?.get("io");
    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id || appointment.patientId,
        doctorId: appointment.doctor?._id || appointment.doctorId
      });
    }

    res.json({ message: "Appointment cancelled successfully", appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rescheduleAppointment = async (req, res) => {
  try {
    const { slotId, date, time } = req.body;

    const appointment = await findAppointmentById(req.params.id, [
      { path: "doctor", select: "user" },
      { path: "patient", select: "name email" }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // Authorization check
    if (req.user.role === "patient") {
      const patientId = appointment.patient?._id || appointment.patient;
      if (String(patientId) !== String(req.user._id)) {
        return res.status(403).json({ message: "Unauthorized: not your appointment" });
      }
    } else if (req.user.role === "doctor") {
      const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
      if (error) return res.status(403).json({ message: error });
    } else {
      return res.status(403).json({ message: "Only the patient or assigned doctor can reschedule this appointment" });
    }

    if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.APPROVED, APPOINTMENT_STATUS.RESCHEDULED].includes(appointment.status)) {
      return res.status(400).json({ message: "This appointment cannot be rescheduled in its current status" });
    }

    const docId = appointment.doctorId || appointment.doctor?._id || appointment.doctor;
    let targetSlotId = slotId;

    if (!targetSlotId && date && time) {
      targetSlotId = `${docId}|${date}|${time}`;
    }

    if (!targetSlotId) {
      return res.status(400).json({ message: "Please select a valid slot or date/time" });
    }

    let newSlot;
    try {
      newSlot = await lockSlotOrThrow(targetSlotId);
    } catch (error) {
      return res.status(400).json({ message: "Selected slot is unavailable" });
    }

    if (String(newSlot.doctorId) !== String(docId)) {
      return res.status(400).json({ message: "Selected slot does not belong to this appointment's doctor" });
    }

    await releaseSlotIfExists(appointment.slotId);

    const fromStatus = appointment.status;
    appointment.slotId = newSlot._id;
    appointment.date = newSlot.date;
    appointment.time = newSlot.startTime;
    appointment.reminderSent = { before24h: false, before2h: false };

    // 🔄 RESCHEDULE LOGIC:
    // Patient reschedules → revert to PENDING so doctor must re-approve the new slot
    // Doctor reschedules  → keep as RESCHEDULED (doctor already knows the new slot)
    if (req.user.role === "patient") {
      appointment.status = APPOINTMENT_STATUS.PENDING;
      appointment.rescheduledByPatient = true;
    } else {
      appointment.status = APPOINTMENT_STATUS.RESCHEDULED;
      appointment.rescheduledByPatient = false;
    }

    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: req.user.role || "patient",
      action: "appointment-rescheduled",
      fromStatus,
      toStatus: appointment.status,
      metadata: { newDate: appointment.date, newTime: appointment.time, rescheduledBy: req.user.role }
    });

    const io = req.io || req.app?.get("io");
    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        date: appointment.date,
        time: appointment.time,
        patientId: appointment.patient?._id || appointment.patient,
        doctorId: docId
      });
    }

    // 📧 Notify doctor by email when patient reschedules so they can re-approve
    if (req.user.role === "patient") {
      const doctorEmail = appointment.doctor?.user?.email;
      const doctorName  = appointment.doctor?.user?.name || "Doctor";
      const patientName = appointment.patient?.name || "Patient";
      if (doctorEmail) {
        try {
          await sendEmail(
            doctorEmail,
            "Patient Rescheduled — Re-Approval Required",
            `<h3>Hello Dr. ${doctorName},</h3>
             <p><b>${patientName}</b> has rescheduled their appointment to
             <b>${appointment.date}</b> at <b>${appointment.time}</b>.</p>
             <p>The appointment is now back in <b>Pending</b> status and requires your approval.</p>
             <p>Please log in to approve or reject the new slot.</p>`
          );
        } catch (emailErr) {
          console.error("Reschedule notify email failed:", emailErr.message);
        }
      }
    }

    res.json({ message: "Appointment rescheduled successfully", appointment });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Selected slot is no longer available" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const markAsArrived = async (req, res) => {
  try {
    const appointment = await findAppointmentForPatient(req.params.id, req.user._id, [
      { path: "doctor", select: "user" }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (appointment.status !== APPOINTMENT_STATUS.APPROVED) {
      return res.status(400).json({ message: "Check-in allowed only for approved appointments" });
    }

    if (appointment.checkInTime) {
      return res.status(400).json({ message: "Already checked in" });
    }

    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
      return res.status(400).json({ message: "Cannot check in for cancelled appointment" });
    }

    if (!isSameLocalDate(appointment.date)) {
      return res.status(400).json({ message: "Check-in is only allowed on appointment date" });
    }

    const appointmentDateTime = parseAppointmentDateTime(appointment.date, appointment.time);
    if (!appointmentDateTime) {
      return res.status(400).json({ message: "Invalid appointment date/time" });
    }

    const earliestCheckIn = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
    if (new Date() < earliestCheckIn) {
      return res.status(400).json({ message: "Check-in opens 1 hour before appointment time" });
    }

    appointment.status = APPOINTMENT_STATUS.ARRIVED;
    appointment.checkInTime = new Date();
    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "patient",
      action: "patient-check-in",
      fromStatus: APPOINTMENT_STATUS.APPROVED,
      toStatus: APPOINTMENT_STATUS.ARRIVED,
      metadata: { checkInTime: appointment.checkInTime }
    });

    const io = req.io || req.app?.get("io");
    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id || appointment.patientId,
        doctorId: appointment.doctor?._id || appointment.doctorId
      });
    }

    return res.json({ message: "Checked in successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorDoc = await getDoctorByUserId(req.user._id);
    if (!doctorDoc) return res.status(404).json({ message: "Doctor profile not found" });

    const appointments = await Appointment.find({ doctor: doctorDoc._id })
      .populate("patient", "name email medicalHistory")
      .populate({ path: "doctor", select: "specialization fees user profileImage", populate: { path: "user", select: "name email profileImage" } })
      .populate("prescription")
      .populate("review")
      .sort({ date: -1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate({ path: "doctor", select: "specialization fees user profileImage", populate: { path: "user", select: "name email profileImage" } })
      .populate("patient", "name email")
      .sort({ date: -1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminUpdateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = Object.values(APPOINTMENT_STATUS);

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === APPOINTMENT_STATUS.NO_SHOW) {
      return res.status(400).json({ message: "No-show status is no longer supported" });
    }

    const appointment = await findAppointmentById(req.params.id, [
      { path: "patient", select: "name email _id" },
      { path: "doctor", select: "user", populate: { path: "user", select: "name email _id" } }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const fromStatus = appointment.status;
    appointment.status = status;
    await appointment.save();

    if (status === APPOINTMENT_STATUS.CANCELLED && appointment.slotId) {
      await releaseSlotIfExists(appointment.slotId);
    }

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "admin",
      action: "admin-status-update",
      fromStatus,
      toStatus: status
    });

    if (req.io) {
      req.io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id,
        doctorId: appointment.doctor?._id
      });
    }

    res.json({ message: "Appointment status updated", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminCancelAppointment = async (req, res) => {
  try {
    const { reason = "Cancelled by admin" } = req.body || {};

    const appointment = await findAppointmentById(req.params.id, [
      { path: "patient", select: "name email _id" },
      { path: "doctor", select: "user", populate: { path: "user", select: "name email _id" } }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const fromStatus = appointment.status;
    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    appointment.cancellationReason = String(reason).trim() || "Cancelled by admin";
    appointment.cancelledBy = "admin";
    appointment.cancelledAt = new Date();
    await appointment.save();

    if (appointment.slotId) {
      await releaseSlotIfExists(appointment.slotId);
    }

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "admin",
      action: "admin-cancel-appointment",
      fromStatus,
      toStatus: APPOINTMENT_STATUS.CANCELLED,
      metadata: { reason }
    });

    const doctorName = appointment.doctor?.user?.name || "Doctor";
    const patientName = appointment.patient?.name || "Patient";

    try {
      if (appointment.patient?.email) {
        await sendEmail(
          appointment.patient.email,
          "Appointment Cancelled by Admin",
          `<h3>Hello ${patientName},</h3>
           <p>Your appointment with <b>Dr. ${doctorName}</b> on <b>${appointment.date}</b> at <b>${appointment.time}</b> has been cancelled by admin.</p>
           <p>Reason: ${reason}</p>`
        );
      }

      if (appointment.doctor?.user?.email) {
        await sendEmail(
          appointment.doctor.user.email,
          "Appointment Cancelled by Admin",
          `<h3>Hello Dr. ${doctorName},</h3>
           <p>The appointment with <b>${patientName}</b> on <b>${appointment.date}</b> at <b>${appointment.time}</b> has been cancelled by admin.</p>
           <p>Reason: ${reason}</p>`
        );
      }
    } catch (emailError) {
      console.error("Admin cancel email failed:", emailError.message);
    }

    if (req.io) {
      req.io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id,
        doctorId: appointment.doctor?._id
      });
    }

    res.json({ message: "Appointment cancelled by admin", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminDeleteAppointment = async (req, res) => {
  try {
    const { reason = "Deleted by admin" } = req.body || {};

    const appointment = await findAppointmentById(req.params.id, [
      { path: "patient", select: "name email _id" },
      { path: "doctor", select: "user", populate: { path: "user", select: "name email _id" } }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const appointmentSnapshot = {
      _id: appointment._id,
      date: appointment.date,
      time: appointment.time,
      patientId: appointment.patient?._id,
      doctorId: appointment.doctor?._id
    };

    if (appointment.slotId) {
      await releaseSlotIfExists(appointment.slotId);
    }

    await Appointment.deleteOne({ _id: appointment._id });

    await logAudit({
      appointmentId: appointmentSnapshot._id,
      actorId: req.user._id,
      actorRole: "admin",
      action: "admin-delete-appointment",
      fromStatus: appointment.status,
      toStatus: "deleted",
      metadata: { reason }
    });

    const doctorName = appointment.doctor?.user?.name || "Doctor";
    const patientName = appointment.patient?.name || "Patient";

    try {
      if (appointment.patient?.email) {
        await sendEmail(
          appointment.patient.email,
          "Appointment Deleted by Admin",
          `<h3>Hello ${patientName},</h3>
           <p>Your appointment with <b>Dr. ${doctorName}</b> on <b>${appointment.date}</b> at <b>${appointment.time}</b> has been deleted by admin.</p>
           <p>Reason: ${reason}</p>`
        );
      }

      if (appointment.doctor?.user?.email) {
        await sendEmail(
          appointment.doctor.user.email,
          "Appointment Deleted by Admin",
          `<h3>Hello Dr. ${doctorName},</h3>
           <p>The appointment with <b>${patientName}</b> on <b>${appointment.date}</b> at <b>${appointment.time}</b> has been deleted by admin.</p>
           <p>Reason: ${reason}</p>`
        );
      }
    } catch (emailError) {
      console.error("Admin delete email failed:", emailError.message);
    }

    if (req.io) {
      req.io.emit("appointmentDeletedByAdmin", {
        appointmentId: appointmentSnapshot._id,
        date: appointmentSnapshot.date,
        time: appointmentSnapshot.time,
        patientId: appointmentSnapshot.patientId,
        doctorId: appointmentSnapshot.doctorId
      });
    }

    res.json({ message: "Appointment deleted by admin" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    const validStatuses = Object.values(APPOINTMENT_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === APPOINTMENT_STATUS.NO_SHOW) {
      return res.status(400).json({ message: "No-show status is no longer supported" });
    }

    const appointment = await findAppointmentById(req.params.id, [
      { path: "patient", select: "name email" },
      { path: "doctor", select: "user", populate: { path: "user", select: "name email _id" } }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    if (!canTransitionStatus(appointment.status, status)) {
      return res.status(400).json({ message: `Invalid status transition from ${appointment.status} to ${status}` });
    }

    if (status === APPOINTMENT_STATUS.CONSULTATION_COMPLETED) {
      const prescription = await Prescription.findOne({ appointmentId: appointment._id, deletedAt: null });
      if (!prescription || !prescription.diagnosis || !prescription.medicines?.length) {
        return res.status(400).json({ message: "Cannot complete consultation without diagnosis and prescription" });
      }
      appointment.consultationEndTime = new Date();
    }

    if (status === APPOINTMENT_STATUS.CONSULTATION_STARTED || status === APPOINTMENT_STATUS.IN_PROGRESS) {
      appointment.consultationStartTime = appointment.consultationStartTime || new Date();
    }

    if (status === APPOINTMENT_STATUS.ARRIVED) {
      appointment.checkInTime = appointment.checkInTime || new Date();
    }

    if (status === APPOINTMENT_STATUS.COMPLETED) {
      appointment.consultationEndTime = appointment.consultationEndTime || new Date();
    }

    const fromStatus = appointment.status;
    appointment.status = status;

    if (status === APPOINTMENT_STATUS.CANCELLED) {
      appointment.cancellationReason = String(reason || "Cancelled by doctor").trim();
      appointment.cancelledBy = "doctor";
      appointment.cancelledAt = new Date();
    }

    await appointment.save();

    if (status === APPOINTMENT_STATUS.CANCELLED && appointment.slotId) {
      await releaseSlotIfExists(appointment.slotId);
    }

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "doctor",
      action: "doctor-status-update",
      fromStatus,
      toStatus: status,
      metadata: status === APPOINTMENT_STATUS.CANCELLED
        ? { reason: appointment.cancellationReason }
        : undefined
    });

    if (status === APPOINTMENT_STATUS.CANCELLED) {
      const doctorName = appointment.doctor?.user?.name || "Doctor";
      const patientName = appointment.patient?.name || "Patient";

      try {
        if (appointment.patient?.email) {
          await sendEmail(
            appointment.patient.email,
            "Appointment Cancelled by Doctor",
            `<h3>Hello ${patientName},</h3>
             <p>Your appointment with <b>Dr. ${doctorName}</b> on <b>${appointment.date}</b> at <b>${appointment.time}</b> has been cancelled by the doctor.</p>
             <p>Reason: ${appointment.cancellationReason}</p>`
          );
        }
      } catch (emailError) {
        console.error("Doctor cancel email failed:", emailError.message);
      }
    }

    const io = req.io || req.app?.get("io");
    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id || appointment.patientId,
        doctorId: appointment.doctor?._id || appointment.doctorId
      });
      const doctorId = appointment.doctor?._id || appointment.doctorId;
      await emitQueueUpdate(io, doctorId, appointment.date);
    }

    res.json({ message: "Status updated successfully", appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const startConsultation = async (req, res) => {
  try {
    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    if (appointment.status !== APPOINTMENT_STATUS.ARRIVED) {
      return res.status(400).json({ message: "Cannot start consultation before patient arrives" });
    }

    appointment.status = APPOINTMENT_STATUS.CONSULTATION_STARTED;
    appointment.consultationStartTime = new Date();
    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "doctor",
      action: "consultation-started",
      fromStatus: APPOINTMENT_STATUS.ARRIVED,
      toStatus: APPOINTMENT_STATUS.CONSULTATION_STARTED,
      metadata: { consultationStartTime: appointment.consultationStartTime }
    });

    const io = req.io || req.app?.get("io");
    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id || appointment.patientId,
        doctorId: appointment.doctor?._id || appointment.doctorId
      });
      // 🎟️ QUEUE: Broadcast updated queue state to all waiting patients
      const doctorId = appointment.doctor?._id || appointment.doctorId;
      await emitQueueUpdate(io, doctorId, appointment.date);
    }

    res.json({ message: "Consultation started", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const completeConsultation = async (req, res) => {
  try {
    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    if (appointment.status !== APPOINTMENT_STATUS.CONSULTATION_STARTED) {
      return res.status(400).json({ message: "Consultation must be started first" });
    }

    const prescription = await Prescription.findOne({ appointmentId: appointment._id, deletedAt: null });
    if (!prescription || !prescription.diagnosis || !prescription.medicines?.length) {
      return res.status(400).json({ message: "Cannot complete without prescription" });
    }

    appointment.status = APPOINTMENT_STATUS.CONSULTATION_COMPLETED;
    appointment.consultationEndTime = new Date();
    appointment.prescription = prescription._id;
    appointment.medicalReport = {
      diagnosis: prescription.diagnosis,
      prescription: prescription.medicines.map((m) => `${m.name} ${m.dosage} ${m.frequency} for ${m.duration}`).join("\n"),
      doctorNotes: appointment.medicalReport?.doctorNotes || "",
      followUpDate: prescription.followUpDate || null
    };
    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "doctor",
      action: "consultation-completed",
      fromStatus: APPOINTMENT_STATUS.CONSULTATION_STARTED,
      toStatus: APPOINTMENT_STATUS.CONSULTATION_COMPLETED,
      metadata: { consultationEndTime: appointment.consultationEndTime }
    });

    const io = req.io || req.app?.get("io");
    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id || appointment.patientId,
        doctorId: appointment.doctor?._id || appointment.doctorId
      });
      // 🎟️ QUEUE: Mark as done + broadcast updated queue to remaining waiting patients
      appointment.queueStatus = "done";
      await appointment.save();
      const doctorId = appointment.doctor?._id || appointment.doctorId;
      await emitQueueUpdate(io, doctorId, appointment.date);
    }

    res.json({ message: "Consultation completed", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertPrescription = async (req, res) => {
  try {
    const {
      diagnosis,
      medicines,
      advice = "",
      followUpDate = null,
      overrideSafetyCheck = false,
      overrideReason = ""
    } = req.body;

    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error, doctorDoc } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    const validationError = validatePrescriptionPayload({ diagnosis, medicines, followUpDate });
    if (validationError) return res.status(400).json({ message: validationError });

    // Fetch patient profile to evaluate allergies and medical history
    const patientUser = await getUserById(appointment.patientId || appointment.patient);
    const patientAllergies = patientUser?.medicalHistory?.allergies || "";
    const chronicDiseases = patientUser?.medicalHistory?.chronicDiseases || "";
    const currentMedications = patientUser?.medicalHistory?.currentMedications || "";

    // 🛡️ Evaluate Prescription Safety & Generate Patient-Friendly Summary
    const safetyEvaluation = await evaluatePrescriptionSafety({
      patientAllergies,
      chronicDiseases,
      currentMedications,
      medicines,
      diagnosis,
      advice,
      followUpDate
    });

    // If clinical allergy conflict is flagged and doctor has NOT overridden, pause and alert doctor
    if (safetyEvaluation.hasConflict && !overrideSafetyCheck) {
      return res.status(409).json({
        status: "conflict_detected",
        message: "Prescription safety conflict detected with patient's documented allergies",
        conflicts: safetyEvaluation.conflicts,
        patientName: patientUser?.name || "Patient",
        patientAllergies: patientAllergies || "None declared",
        patientSummary: safetyEvaluation.patientSummary
      });
    }

    const finalPatientSummary = safetyEvaluation.patientSummary || "";
    const safetyStatus = safetyEvaluation.hasConflict
      ? (overrideSafetyCheck ? "overridden" : "flagged")
      : "safe";

    let prescription = await Prescription.findOne({ appointmentId: appointment._id, deletedAt: null });

    if (prescription) {
      const editableUntil = new Date(prescription.createdAt.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() > editableUntil) {
        return res.status(400).json({ message: "Prescription can only be edited within 24 hours" });
      }

      prescription.versionHistory.push({
        version: prescription.version,
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines,
        advice: prescription.advice,
        followUpDate: prescription.followUpDate,
        patientSummary: prescription.patientSummary,
        editedBy: req.user._id,
        editedAt: new Date()
      });

      prescription.diagnosis = diagnosis.trim();
      prescription.medicines = medicines;
      prescription.advice = advice;
      prescription.followUpDate = followUpDate || null;
      prescription.patientSummary = finalPatientSummary;
      prescription.safetyCheck = {
        status: safetyStatus,
        conflicts: safetyEvaluation.conflicts || [],
        checkedAt: new Date()
      };
      if (overrideSafetyCheck) {
        prescription.safetyOverride = {
          overridden: true,
          reason: overrideReason || "Doctor clinical override acknowledged"
        };
      }
      prescription.version += 1;
      await prescription.save();
    } else {
      prescription = await Prescription.create({
        appointmentId: appointment._id,
        appointment: appointment._id,
        doctorId: doctorDoc._id,
        doctor: doctorDoc._id,
        patientId: appointment.patientId || appointment.patient,
        patient: appointment.patientId || appointment.patient,
        diagnosis: diagnosis.trim(),
        medicines,
        advice,
        followUpDate: followUpDate || null,
        patientSummary: finalPatientSummary,
        safetyCheck: {
          status: safetyStatus,
          conflicts: safetyEvaluation.conflicts || [],
          checkedAt: new Date()
        },
        safetyOverride: {
          overridden: Boolean(overrideSafetyCheck),
          reason: overrideReason || ""
        },
        version: 1,
        versionHistory: []
      });
    }

    appointment.prescription = prescription._id;
    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "doctor",
      action: "prescription-upsert",
      metadata: { prescriptionId: prescription._id, version: prescription.version, safetyStatus }
    });

    res.json({
      message: overrideSafetyCheck ? "Prescription saved (Safety conflict overridden)" : "Prescription saved",
      prescription,
      safetyCheck: prescription.safetyCheck
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPrescription = async (req, res) => {
  try {
    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (req.user.role === "patient" && String(appointment.patient) !== String(req.user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (req.user.role === "doctor") {
      const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
      if (error) return res.status(403).json({ message: error });
    }

    const prescription = await Prescription.findOne({ appointmentId: appointment._id, deletedAt: null });
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    res.json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadPrescriptionPdf = async (req, res) => {
  try {
    const appointment = await findAppointmentById(req.params.id, [
      { path: "patient", select: "name" },
      { path: "doctor", select: "user", populate: { path: "user", select: "name" } }
    ]);

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (req.user.role === "patient" && String(appointment.patient._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (req.user.role === "doctor") {
      const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
      if (error) return res.status(403).json({ message: error });
    }

    const prescription = await Prescription.findOne({ appointmentId: appointment._id, deletedAt: null });
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=prescription-${appointment._id}.pdf`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("Prescription", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Doctor: Dr. ${appointment.doctor?.user?.name || "N/A"}`);
    doc.text(`Patient: ${appointment.patient?.name || "N/A"}`);
    doc.text(`Appointment Date: ${appointment.date} ${appointment.time}`);
    doc.text(`Version: ${prescription.version}`);
    doc.moveDown();

    doc.fontSize(13).text("Diagnosis", { underline: true });
    doc.fontSize(11).text(prescription.diagnosis);
    doc.moveDown();

    doc.fontSize(13).text("Medicines", { underline: true });
    prescription.medicines.forEach((med, idx) => {
      doc.fontSize(11).text(`${idx + 1}. ${med.name} - ${med.dosage}, ${med.frequency}, ${med.duration}`);
      if (med.instructions) doc.text(`   Instructions: ${med.instructions}`);
    });

    if (prescription.advice) {
      doc.moveDown();
      doc.fontSize(13).text("General Advice", { underline: true });
      doc.fontSize(11).text(prescription.advice);
    }

    if (prescription.patientSummary) {
      doc.moveDown();
      doc.fontSize(13).text("Patient Care Summary & Instructions", { underline: true });
      doc.fontSize(10.5).text(prescription.patientSummary);
    }

    if (prescription.followUpDate) {
      doc.moveDown();
      doc.fontSize(11).text(`Follow-up Date: ${new Date(prescription.followUpDate).toLocaleDateString()}`);
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePrescription = async (req, res) => {
  try {
    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    const prescription = await Prescription.findOne({ appointmentId: appointment._id, deletedAt: null });
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    const deleteUntil = new Date(prescription.createdAt.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > deleteUntil) {
      return res.status(400).json({ message: "Prescription cannot be deleted after 24 hours" });
    }

    prescription.deletedAt = new Date();
    await prescription.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "doctor",
      action: "prescription-deleted",
      metadata: { prescriptionId: prescription._id }
    });

    res.json({ message: "Prescription deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertDoctorNote = async (req, res) => {
  try {
    const { symptomsObserved, clinicalObservations, suggestedTests, internalRemarks } = req.body;

    for (const field of [symptomsObserved, clinicalObservations, suggestedTests, internalRemarks]) {
      if (!field || String(field).trim().length < 5) {
        return res.status(400).json({ message: "Each note field must contain at least 5 characters" });
      }
    }

    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    const existingCreatedAt = appointment.medicalReport?.doctorNoteCreatedAt
      ? new Date(appointment.medicalReport.doctorNoteCreatedAt)
      : null;

    if (existingCreatedAt) {
      const editableUntil = new Date(existingCreatedAt.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() > editableUntil) {
        return res.status(400).json({ message: "Notes can only be edited within 24 hours" });
      }
    }

    const note = {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId || appointment.doctor,
      symptomsObserved: symptomsObserved.trim(),
      clinicalObservations: clinicalObservations.trim(),
      suggestedTests: suggestedTests.trim(),
      internalRemarks: internalRemarks.trim(),
      createdAt: existingCreatedAt || new Date(),
      updatedAt: new Date(),
      editHistory: [
        ...(appointment.medicalReport?.doctorNoteHistory || []),
        ...(existingCreatedAt
          ? [
              {
                symptomsObserved: appointment.medicalReport?.symptomsObserved || "",
                clinicalObservations: appointment.medicalReport?.clinicalObservations || "",
                suggestedTests: appointment.medicalReport?.suggestedTests || "",
                internalRemarks: appointment.medicalReport?.internalRemarks || "",
                editedBy: req.user._id,
                editedAt: new Date()
              }
            ]
          : [])
      ]
    };

    appointment.medicalReport = {
      ...(appointment.medicalReport || {}),
      symptomsObserved: note.symptomsObserved,
      clinicalObservations: note.clinicalObservations,
      suggestedTests: note.suggestedTests,
      internalRemarks: note.internalRemarks,
      doctorNotes: `${note.symptomsObserved}\n${note.clinicalObservations}\n${note.suggestedTests}\n${note.internalRemarks}`,
      doctorNoteCreatedAt: note.createdAt,
      doctorNoteUpdatedAt: note.updatedAt,
      doctorNoteHistory: note.editHistory
    };
    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "doctor",
      action: "doctor-note-upsert",
      metadata: { noteUpdatedAt: note.updatedAt }
    });

    res.json({ message: "Doctor notes saved", note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorNote = async (req, res) => {
  try {
    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    if (!appointment.medicalReport?.doctorNoteCreatedAt) {
      return res.status(404).json({ message: "Doctor notes not found" });
    }

    const note = {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId || appointment.doctor,
      symptomsObserved: appointment.medicalReport?.symptomsObserved || "",
      clinicalObservations: appointment.medicalReport?.clinicalObservations || "",
      suggestedTests: appointment.medicalReport?.suggestedTests || "",
      internalRemarks: appointment.medicalReport?.internalRemarks || "",
      createdAt: appointment.medicalReport?.doctorNoteCreatedAt,
      updatedAt: appointment.medicalReport?.doctorNoteUpdatedAt,
      editHistory: appointment.medicalReport?.doctorNoteHistory || []
    };

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDoctorNote = async (req, res) => {
  try {
    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { error } = await ensureDoctorOwnsAppointment(req.user._id, appointment);
    if (error) return res.status(403).json({ message: error });

    if (!appointment.medicalReport?.doctorNoteCreatedAt) {
      return res.status(404).json({ message: "Doctor notes not found" });
    }

    const deleteUntil = new Date(new Date(appointment.medicalReport.doctorNoteCreatedAt).getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > deleteUntil) {
      return res.status(400).json({ message: "Cannot delete notes after 24 hours" });
    }

    appointment.medicalReport = {
      ...(appointment.medicalReport || {}),
      symptomsObserved: "",
      clinicalObservations: "",
      suggestedTests: "",
      internalRemarks: "",
      doctorNotes: "",
      doctorNoteCreatedAt: null,
      doctorNoteUpdatedAt: null,
      doctorNoteHistory: []
    };
    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "doctor",
      action: "doctor-note-delete",
      metadata: { deletedAt: new Date() }
    });

    res.json({ message: "Doctor notes deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitAppointmentReview = async (req, res) => {
  try {
    const { rating, comment = "" } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const appointment = await findAppointmentForPatient(req.params.id, req.user._id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (![APPOINTMENT_STATUS.CONSULTATION_COMPLETED, APPOINTMENT_STATUS.COMPLETED].includes(appointment.status)) {
      return res.status(400).json({ message: "Review can only be added after consultation completion" });
    }

    const existing = await AppointmentReview.findOne({ appointmentId: appointment._id });
    if (existing) {
      return res.status(400).json({ message: "One review per appointment is allowed" });
    }

    const review = await AppointmentReview.create({
      appointmentId: appointment._id,
      doctorId: appointment.doctor,
      patientId: req.user._id,
      rating: Number(rating),
      comment: String(comment || "").trim()
    });

    appointment.review = review._id;
    await appointment.save();

    await logAudit({
      appointmentId: appointment._id,
      actorId: req.user._id,
      actorRole: "patient",
      action: "review-submitted",
      metadata: { rating: Number(rating) }
    });

    res.status(201).json({ message: "Review submitted", review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMedicalHistory = async (req, res) => {
  try {
    const medicalHistory = await Appointment.find({
      patient: req.user._id,
      status: { $in: [APPOINTMENT_STATUS.CONSULTATION_COMPLETED, APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.FOLLOW_UP] }
    })
      .populate({ path: "doctor", select: "specialization fees user hospitalClinicName", populate: { path: "user", select: "name email" } })
      .populate("prescription")
      .populate("review")
      .sort({ date: -1, time: -1 });

    res.json(medicalHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rebookAppointment = async (req, res) => {
  try {
    const { slotId } = req.body;
    const previousAppointmentId = req.params.id;

    const previousAppointment = await Appointment.findOne({
      _id: previousAppointmentId,
      patientId: req.user._id,
      status: { $in: [APPOINTMENT_STATUS.CONSULTATION_COMPLETED, APPOINTMENT_STATUS.COMPLETED] }
    });

    if (!previousAppointment) {
      return res.status(404).json({ message: "Previous appointment not found or not completed" });
    }

    let slot;
    try {
      slot = await lockSlotOrThrow(slotId);
    } catch (error) {
      return res.status(400).json({ message: "Selected slot is unavailable" });
    }

    if (String(slot.doctorId) !== String(previousAppointment.doctorId || previousAppointment.doctor)) {
      return res.status(400).json({ message: "Selected slot does not belong to the same doctor" });
    }

    const doctor = await Doctor.findById(slot.doctorId).populate("user", "name email");

    const newAppointment = await Appointment.create({
      doctorId: slot.doctorId,
      doctor: slot.doctorId,
      patientId: req.user._id,
      patient: req.user._id,
      slotId: slot._id,
      date: slot.date,
      time: slot.startTime,
      status: APPOINTMENT_STATUS.PENDING,
      fees: doctor.fees || 0,
      previousAppointment: previousAppointmentId
    });

    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate({ path: "doctor", select: "hospitalClinicName specialization location fees", populate: { path: "user", select: "name email" } })
      .populate("patient", "name email");

    await logAudit({
      appointmentId: newAppointment._id,
      actorId: req.user._id,
      actorRole: "patient",
      action: "rebook-created",
      toStatus: APPOINTMENT_STATUS.PENDING,
      metadata: { previousAppointmentId }
    });

    res.status(201).json({ message: "Appointment rebooked successfully", appointment: populatedAppointment });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Selected slot is no longer available" });
    }
    res.status(500).json({ error: error.message });
  }
};
