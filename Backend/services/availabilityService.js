import DoctorAvailability from "../models/DoctorAvailability.js";
import { generateSlots } from "./slotGenerator.js";

export const resolveAvailability = async (doctorId, date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[new Date(date).getDay()];

  const availability = await DoctorAvailability.findOne({ doctorId });
  if (!availability) return [];

  const exception = (availability.exceptions || []).find((ex) => ex?.date === date);
  if (exception) {
    if (exception.isUnavailable) return [];
    return generateSlots({
      startTime: exception.startTime,
      endTime: exception.endTime,
      breakEnabled: exception.hasBreak,
      breakStartTime: exception.breakStart,
      breakDuration: exception.breakDuration
    });
  }

  const weekly = (availability.weekly || []).find((slot) => slot?.day === dayName && slot?.isActive);
  if (!weekly) return [];

  return generateSlots({
    startTime: weekly.startTime,
    endTime: weekly.endTime,
    breakEnabled: weekly.hasBreak,
    breakStartTime: weekly.breakStart,
    breakDuration: weekly.breakDuration
  });
};
