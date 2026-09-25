import Appointment from "../models/Appointment.js";
import { sendEmail } from "../utils/sendEmail.js";
import { parseAppointmentDateTime } from "../utils/appointmentDateTime.js";
import { APPOINTMENT_STATUS } from "../utils/appointmentStatus.js";
import { releaseSlotIfExists } from "./appointmentService.js";

const APPOINTMENT_DURATION_MINUTES = 50;

const shouldSend = (hoursLeft, type) => {
  // Send delayed reminders after a restart instead of permanently missing the
  // notification because a narrow polling window has passed.
  if (type === "24h") return hoursLeft <= 24 && hoursLeft > 2;
  if (type === "2h") return hoursLeft <= 2 && hoursLeft > 1;
  return false;
};

const pushReminderHistory = (appointment, type, channel = "status") => {
  appointment.reminderHistory.push({ type, sentAt: new Date(), channel });
  if (type === "24h") appointment.reminderSent.before24h = true;
  if (type === "2h") appointment.reminderSent.before2h = true;
};

export const processAppointmentReminders = async () => {
  const appointments = await Appointment.find({
    status: APPOINTMENT_STATUS.APPROVED,
    date: { $ne: null },
    time: { $ne: null }
  })
    .populate("patient", "name email")
    .populate({ path: "doctor", select: "user", populate: { path: "user", select: "name" } });

  for (const appointment of appointments) {
    const appointmentDate = parseAppointmentDateTime(appointment.date, appointment.time);
    if (!appointmentDate) continue;

    const hoursLeft = (appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft <= 0) continue;

    const reminderTargets = [
      { type: "24h", sent: appointment.reminderSent?.before24h },
      { type: "2h", sent: appointment.reminderSent?.before2h }
    ];

    for (const target of reminderTargets) {
      if (target.sent || !shouldSend(hoursLeft, target.type)) continue;

      const message =
        target.type === "24h"
          ? `Reminder: You have an appointment with Dr. ${appointment.doctor?.user?.name || "Doctor"} tomorrow at ${appointment.time}.`
          : `Reminder: Your appointment with Dr. ${appointment.doctor?.user?.name || "Doctor"} is in 2 hours at ${appointment.time}.`;

      pushReminderHistory(appointment, target.type, "status");

      try {
        if (appointment.patient?.email) {
          await sendEmail(
            appointment.patient.email,
            "Appointment Reminder",
            `<p>${message}</p><p>Date: ${appointment.date}</p><p>Time: ${appointment.time}</p>`
          );
        }
      } catch (error) {
        console.error("Email reminder failed:", error.message);
      }

      await appointment.save();
    }
  }
};

export const processExpiredUnarrivedAppointments = async (io = null) => {
  const appointments = await Appointment.find({
    status: APPOINTMENT_STATUS.APPROVED,
    date: { $ne: null },
    time: { $ne: null }
  })
    .populate("patient", "name email _id")
    .populate({ path: "doctor", select: "user _id", populate: { path: "user", select: "name _id" } });

  const now = new Date();

  for (const appointment of appointments) {
    const appointmentStart = parseAppointmentDateTime(appointment.date, appointment.time);
    if (!appointmentStart) continue;

    const appointmentEnd = new Date(
      appointmentStart.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000
    );

    if (now < appointmentEnd) continue;

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    appointment.cancellationReason = "Auto-cancelled: patient did not check in before appointment end time";
    appointment.cancelledBy = "system";
    appointment.cancelledAt = now;
    await appointment.save();

    if (appointment.slotId) {
      await releaseSlotIfExists(appointment.slotId);
    }

    try {
      if (appointment.patient?.email) {
        const doctorName = appointment.doctor?.user?.name || "Doctor";
        await sendEmail(
          appointment.patient.email,
          "Appointment Auto Cancelled",
          `<p>Hello ${appointment.patient?.name || "Patient"},</p>
           <p>Your appointment with <b>Dr. ${doctorName}</b> on <b>${appointment.date}</b> at <b>${appointment.time}</b> was automatically cancelled because check-in was not completed before the appointment ended.</p>`
        );
      }
    } catch (error) {
      console.error("Auto-cancel email failed:", error.message);
    }

    if (io) {
      io.emit("appointmentStatusUpdate", {
        appointmentId: appointment._id,
        status: appointment.status,
        patientId: appointment.patient?._id,
        doctorId: appointment.doctor?._id
      });
    }
  }
};
