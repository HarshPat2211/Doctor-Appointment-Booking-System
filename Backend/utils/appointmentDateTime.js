const TIME_REGEX = /(\d{1,2}):(\d{2})\s*(am|pm)?/i;

export const parseAppointmentDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  const base = new Date(dateStr);
  if (Number.isNaN(base.getTime())) return null;

  const match = String(timeStr).trim().match(TIME_REGEX);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toLowerCase();

  if (period) {
    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  }

  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hour,
    minute,
    0,
    0
  );
};

export const hoursBetweenNowAndAppointment = (dateStr, timeStr) => {
  const appointmentDate = parseAppointmentDateTime(dateStr, timeStr);
  if (!appointmentDate) return null;

  return (appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60);
};

export const isSameLocalDate = (dateStr, referenceDate = new Date()) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
};
