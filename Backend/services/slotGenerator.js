const SLOT_DURATION = 50;

const toMin = t => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const toTime = m =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const generateSlots = ({
  startTime,
  endTime,
  breakEnabled,
  breakStartTime,
  breakDuration
}) => {
  const slots = [];
  let cur = toMin(startTime);
  const end = toMin(endTime);

  const bStart = breakEnabled ? toMin(breakStartTime) : null;
  const bEnd = breakEnabled ? bStart + breakDuration : null;

  while (cur + SLOT_DURATION <= end) {
    if (breakEnabled && cur >= bStart && cur < bEnd) {
      cur = bEnd;
      continue;
    }
    slots.push({
      startTime: toTime(cur),
      endTime: toTime(cur + SLOT_DURATION)
    });
    cur += SLOT_DURATION;
  }
  return slots;
};
