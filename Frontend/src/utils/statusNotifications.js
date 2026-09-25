export const APPOINTMENT_NOTIFICATION_STATUSES = new Set([
  "pending",
  "approved",
  "arrived",
  "consultation-started",
  "consultation-completed",
  "cancelled",
  "rejected",
  "rescheduled",
  "follow-up"
]);

const STORAGE_PREFIX = "dismissedStatusNotifications";

const normalizeDoctorName = (name) => {
  const raw = String(name || "").trim();
  const withoutPrefix = raw.replace(/^dr\.?\s+/i, "").trim();
  return withoutPrefix || "Doctor";
};

const toTimestamp = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "0";
  return String(parsed.getTime());
};

export const getNotificationStorageKey = ({ userId, role }) => {
  if (!userId || !role) return null;
  return `${STORAGE_PREFIX}:${role}:${userId}`;
};

export const getDismissedNotificationIds = ({ userId, role }) => {
  const key = getNotificationStorageKey({ userId, role });
  if (!key) return new Set();

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

export const saveDismissedNotificationIds = ({ userId, role, ids }) => {
  const key = getNotificationStorageKey({ userId, role });
  if (!key) return;

  const normalized = Array.from(new Set(Array.isArray(ids) ? ids : Array.from(ids || [])));
  localStorage.setItem(key, JSON.stringify(normalized));
};

export const appendDismissedNotificationIds = ({ userId, role, ids }) => {
  const existing = getDismissedNotificationIds({ userId, role });
  const incoming = Array.isArray(ids) ? ids : Array.from(ids || []);
  for (const id of incoming) {
    if (id) existing.add(id);
  }
  saveDismissedNotificationIds({ userId, role, ids: Array.from(existing) });
};

const statusMessage = (appointment, role) => {
  const doctorName = appointment?.doctor?.user?.name || "Doctor";
  const doctorLabel = `Dr. ${normalizeDoctorName(doctorName)}`;
  const patientName = appointment?.patient?.name || "Patient";
  const dateText = `${appointment?.date || ""} ${appointment?.time || ""}`.trim();

  switch (appointment.status) {
    case "pending":
      return role === "doctor"
        ? `New appointment request from ${patientName} (${dateText})`
        : `Appointment request sent to ${doctorLabel}`;
    case "approved":
      return role === "doctor"
        ? `${patientName}'s appointment is approved (${dateText})`
        : `Your appointment with ${doctorLabel} is approved`;
    case "arrived":
      return role === "doctor"
        ? `${patientName} has arrived for consultation`
        : `You checked in for ${doctorLabel}`;
    case "consultation-started":
      return role === "doctor"
        ? `Consultation started with ${patientName}`
        : `Consultation started with ${doctorLabel}`;
    case "consultation-completed":
      return role === "doctor"
        ? `Consultation completed with ${patientName}`
        : `Consultation completed with ${doctorLabel}`;
    case "cancelled":
      return role === "doctor"
        ? `${patientName}'s appointment was cancelled`
        : `Appointment with ${doctorLabel} was cancelled`;
    case "rejected":
      return role === "doctor"
        ? `Appointment rejected for ${patientName}`
        : `Appointment was rejected by ${doctorLabel}`;
    case "no-show":
      return role === "doctor"
        ? `${patientName}'s appointment was cancelled`
        : `Appointment with ${doctorLabel} was cancelled`;
    default:
      return `Appointment updated: ${appointment.status}`;
  }
};

export const buildStatusNotifications = ({ appointments = [], role = "patient" }) => {
  const list = appointments
    .filter((item) => APPOINTMENT_NOTIFICATION_STATUSES.has(item.status))
    .map((item) => {
      const createdAt = item.updatedAt || item.createdAt;
      const eventId = `${item._id}:${item.status}:${toTimestamp(createdAt)}`;

      return {
        _id: eventId,
        eventId,
        appointmentId: item._id,
        isRead: false,
        message: statusMessage(item, role),
        createdAt,
        status: item.status
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return list.slice(0, 10);
};
