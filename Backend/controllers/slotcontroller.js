import { resolveAvailability } from "../services/availabilityService.js";
import Appointment from "../models/Appointment.js";

export const getSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    const generated = await resolveAvailability(doctorId, date);
    const bookedAppointments = await Appointment.find({
      doctorId,
      date,
      status: { $nin: ["cancelled", "rejected", "no-show"] }
    }).select("time");

    const bookedTimes = new Set(bookedAppointments.map((item) => item.time));

    let slots = generated
      .map((slot) => {
        const startTime = typeof slot === "string" ? slot : slot.startTime;
        return {
          _id: `${doctorId}|${date}|${startTime}`,
          doctorId,
          date,
          startTime,
          endTime: typeof slot === "string" ? undefined : slot.endTime,
          isBooked: bookedTimes.has(startTime)
        };
      })
      .filter((slot) => !slot.isBooked);

    // 🕒 FILTER OUT PAST SLOTS:
    // If date is today, only show slots whose time is in the future.
    // If date is in the past, return empty list.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (date < todayStr) {
      slots = [];
    } else if (date === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter((slot) => {
        const [h, m] = String(slot.startTime || "").split(":").map(Number);
        return !isNaN(h) && !isNaN(m) && (h * 60 + m) > currentMinutes;
      });
    }

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
