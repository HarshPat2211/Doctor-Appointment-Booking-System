import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Download, Star, FileText, X, Pill, CheckCircle2, XCircle, ClipboardList, Loader2, Activity } from "lucide-react";
import API from "../util/api";
import { showToast } from "../../Redux/toastSlice";
import ConfirmDialog from "../../Componet/ConfirmDialog";
import DoctorAvatar from "../../Componet/DoctorAvatar";
import { getSocket } from "../../utils/socket";

const FLOW = ["pending", "approved", "arrived", "consultation-started", "consultation-completed"];

export default function MyAppointments() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, appointmentId: null, action: null });
  const [reviewModal, setReviewModal] = useState({ open: false, appointmentId: null, rating: 5, comment: "" });
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false,
    appointment: null,
    date: "",
    slotId: "",
    slots: [],
    loadingSlots: false,
    submitting: false,
    mode: "reschedule",
  });

  const parseDateTime = (dateValue, timeValue) => {
    if (!dateValue) return null;

    let year;
    let month;
    let day;

    const rawDate = String(dateValue).trim();
    const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dmyMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
      day = Number(isoMatch[3]);
    } else if (dmyMatch) {
      day = Number(dmyMatch[1]);
      month = Number(dmyMatch[2]);
      year = Number(dmyMatch[3]);
    } else {
      const fallback = new Date(rawDate);
      if (Number.isNaN(fallback.getTime())) return null;
      year = fallback.getFullYear();
      month = fallback.getMonth() + 1;
      day = fallback.getDate();
    }

    let hours = 0;
    let minutes = 0;

    if (timeValue) {
      const rawTime = String(timeValue).trim().toLowerCase();
      const timeMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      if (!timeMatch) return null;

      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2]);
      const period = timeMatch[3];

      if (period) {
        if (period === "pm" && hours !== 12) hours += 12;
        if (period === "am" && hours === 12) hours = 0;
      }
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const toTimestamp = (appointment) => {
    if (!appointment) return 0;

    const parsedDateTime = parseDateTime(appointment.date, appointment.time);
    if (parsedDateTime && !Number.isNaN(parsedDateTime.getTime())) {
      return parsedDateTime.getTime();
    }

    const parsedDateOnly = parseDateTime(appointment.date, null);
    if (parsedDateOnly && !Number.isNaN(parsedDateOnly.getTime())) {
      return parsedDateOnly.getTime();
    }

    const created = new Date(appointment.createdAt || 0);
    return Number.isNaN(created.getTime()) ? 0 : created.getTime();
  };

  const sortAppointments = (list = []) => {
    return [...list].sort((a, b) => {
      const timeDiff = toTimestamp(b) - toTimestamp(a);
      if (timeDiff !== 0) return timeDiff;

      const createdA = new Date(a?.createdAt || 0).getTime();
      const createdB = new Date(b?.createdAt || 0).getTime();
      return createdB - createdA;
    });
  };

  const loadAppointments = async () => {
    try {
      const [appointmentsRes, remindersRes] = await Promise.all([
        API.get("/appointments/my"),
        API.get("/appointments/my/reminders")
      ]);
      const list = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];
      const sorted = sortAppointments(list);
      setAppointments(sorted);
      setReminders(remindersRes.data || []);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || "Failed to load appointments", type: "error" }));
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadAppointments();
      setLoading(false);
    };
    init();
    const socket = getSocket();
    socket.on("appointmentStatusUpdate", loadAppointments);
    return () => socket.off("appointmentStatusUpdate", loadAppointments);
  }, []);

  const canShowCheckIn = (appointment) => {
    if (appointment.status !== "approved") return false;
    if (appointment.checkInTime) return false;
    const now = new Date();
    const apDate = new Date(`${appointment.date} ${appointment.time}`);
    const sameDay = now.toDateString() === new Date(appointment.date).toDateString();
    const oneHourBefore = new Date(apDate.getTime() - 60 * 60 * 1000);
    return sameDay && now >= oneHourBefore;
  };

  const timeline = (status) => {
    const index = FLOW.indexOf(status);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px", alignItems: "center" }}>
        {FLOW.map((item, idx) => (
          <span
            key={item}
            style={{
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "20px",
              textTransform: "capitalize",
              fontWeight: idx <= index ? "600" : "400",
              background: idx <= index
                ? "linear-gradient(135deg, #2563eb, #38bdf8)"
                : "#f0f7ff",
              color: idx <= index ? "#fff" : "#94a3b8",
              border: idx <= index ? "none" : "1px solid #dbeafe",
              boxShadow: idx <= index ? "0 2px 8px rgba(37,99,235,0.2)" : "none",
            }}
          >
            {item.replaceAll("-", " ")}
          </span>
        ))}
      </div>
    );
  };

  const normalizedStatusForFilter = (statusValue) => {
    const status = String(statusValue || "").toLowerCase();
    if (status === "consultation-completed") return "completed";
    if (status === "no-show") return "rejected";
    return status;
  };

  const stats = useMemo(() => {
    return appointments.reduce(
      (acc, appointment) => {
        const status = normalizedStatusForFilter(appointment?.status);
        if (status === "pending") acc.pending += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "completed") acc.completed += 1;
        if (status === "cancelled") acc.cancelled += 1;
        if (status === "rejected") acc.rejected += 1;
        return acc;
      },
      { pending: 0, approved: 0, completed: 0, cancelled: 0, rejected: 0 }
    );
  }, [appointments]);

  const filterButtons = useMemo(() => ([
    { key: "all", label: "All", count: appointments.length },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "cancelled", label: "Cancelled", count: stats.cancelled },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ]), [appointments.length, stats]);

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") return appointments;
    return appointments.filter((appointment) => normalizedStatusForFilter(appointment?.status) === statusFilter);
  }, [appointments, statusFilter]);

  const markArrived = async (id) => {
    try {
      await API.put(`/appointments/${id}/check-in`);
      dispatch(showToast({ message: "Checked in successfully", type: "success" }));
      loadAppointments();
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Check-in failed", type: "error" }));
    }
  };

  const cancelAppointment = async (id) => {
    try {
      await API.put(`/appointments/${id}/cancel`);
      dispatch(showToast({ message: "Appointment cancelled", type: "success" }));
      loadAppointments();
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Cancellation failed", type: "error" }));
    }
  };

  const openRescheduleModal = (appt) => {
    const today = new Date().toISOString().split("T")[0];
    const initialDate = appt.date || today;
    const docId = appt.doctor?._id || appt.doctorId || appt.doctor;
    setRescheduleModal({
      open: true,
      appointment: appt,
      date: initialDate,
      slotId: "",
      slots: [],
      loadingSlots: true,
      submitting: false,
      mode: "reschedule",
    });
    fetchSlotsForReschedule(docId, initialDate);
  };

  const openRebookModal = (appt) => {
    const today = new Date().toISOString().split("T")[0];
    const docId = appt.doctor?._id || appt.doctorId || appt.doctor;
    setRescheduleModal({
      open: true,
      appointment: appt,
      date: today,
      slotId: "",
      slots: [],
      loadingSlots: true,
      submitting: false,
      mode: "rebook",
    });
    fetchSlotsForReschedule(docId, today);
  };

  const fetchSlotsForReschedule = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setRescheduleModal((prev) => ({ ...prev, loadingSlots: true, slots: [], slotId: "" }));
    try {
      const res = await API.get(`/slots/${doctorId}/${date}`);
      let slots = res.data || [];

      // Extra client-side filter for today's past slots
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

      setRescheduleModal((prev) => ({ ...prev, slots, loadingSlots: false }));
    } catch {
      setRescheduleModal((prev) => ({ ...prev, loadingSlots: false }));
    }
  };

  const handleRescheduleDateChange = (newDate) => {
    setRescheduleModal((prev) => ({ ...prev, date: newDate }));
    const docId = rescheduleModal.appointment?.doctor?._id || rescheduleModal.appointment?.doctorId || rescheduleModal.appointment?.doctor;
    fetchSlotsForReschedule(docId, newDate);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal.slotId) {
      dispatch(showToast({ message: "Please select an available time slot", type: "warning" }));
      return;
    }
    setRescheduleModal((prev) => ({ ...prev, submitting: true }));
    try {
      const selectedSlot = rescheduleModal.slots.find((s) => s._id === rescheduleModal.slotId);
      if (rescheduleModal.mode === "rebook") {
        await API.post(`/appointments/${rescheduleModal.appointment._id}/rebook`, {
          slotId: rescheduleModal.slotId,
        });
      } else {
        await API.put(`/appointments/${rescheduleModal.appointment._id}/reschedule`, {
          slotId: rescheduleModal.slotId,
          date: rescheduleModal.date,
          time: selectedSlot?.startTime,
        });
      }
      dispatch(showToast({ message: rescheduleModal.mode === "rebook" ? "Follow-up appointment booked successfully!" : "Appointment rescheduled successfully!", type: "success" }));
      setRescheduleModal({ open: false, appointment: null, date: "", slotId: "", slots: [], loadingSlots: false, submitting: false, mode: "reschedule" });
      loadAppointments();
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.error || err.response?.data?.message || `Failed to ${rescheduleModal.mode === "rebook" ? "book follow-up" : "reschedule"}`, type: "error" }));
      setRescheduleModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const viewPrescription = async (id) => {
    try {
      const { data } = await API.get(`/appointments/${id}/prescription`);
      setSelectedPrescription(data);
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Prescription not found", type: "error" }));
    }
  };

  const downloadPrescription = async (id) => {
    try {
      const response = await API.get(`/appointments/${id}/prescription/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `prescription-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Download failed", type: "error" }));
    }
  };

  const submitReview = async () => {
    try {
      await API.post(`/appointments/${reviewModal.appointmentId}/review`, {
        rating: reviewModal.rating,
        comment: reviewModal.comment,
      });
      dispatch(showToast({ message: "Review submitted", type: "success" }));
      setReviewModal({ open: false, appointmentId: null, rating: 5, comment: "" });
      loadAppointments();
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Review submit failed", type: "error" }));
    }
  };

  const statusStyle = (status) => {
    if (!status) return { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
    const s = status.toLowerCase();
    if (s === "approved") return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
    if (s === "pending") return { color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
    if (s === "consultation-completed" || s === "completed") return { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" };
    if (s === "cancelled") return { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    if (s === "arrived") return { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" };
    if (s === "rescheduled") return { color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" };
    return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
  };

  const formatDoctorName = (name) => {
    if (!name) return "Doctor";
    const trimmed = String(name).trim();
    return trimmed.replace(/^dr\.?\s+/i, "");
  };

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#f0f7ff,#fff)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "50%",
          border: "3px solid #dbeafe", borderTopColor: "#2563eb",
          animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
        }} />
        <p style={{ color: "#2563eb", fontSize: "14px", fontWeight: "500" }}>Loading appointments...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)",
      padding: "28px",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px",
            background: "linear-gradient(135deg,#2563eb,#38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
          }}>
            <ClipboardList size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f" }}>My Appointments</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Track and manage your health visits</p>
          </div>
        </div>

        {/* ── REMINDERS ── */}
        {reminders.length > 0 && (
          <div style={{
            background: "#fff", borderRadius: "16px",
            padding: "18px 20px", border: "1px solid #dbeafe",
            boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Clock size={15} style={{ color: "#2563eb" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>Reminders</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {reminders.slice(0, 5).map((item) => (
                <div key={item._id} style={{
                  padding: "10px 14px", borderRadius: "10px",
                  background: "#eff6ff", border: "1px solid #bfdbfe",
                  fontSize: "13px", color: "#1e40af", fontWeight: "500",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <Clock size={13} style={{ color: "#60a5fa", flexShrink: 0 }} />
                  Dr. {formatDoctorName(item.doctor?.user?.name || item.doctorName)} • {item.date} • {item.time}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "14px" }}>
          {[
            { key: "pending", label: "Pending", value: stats.pending, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
            { key: "approved", label: "Approved", value: stats.approved, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
            { key: "completed", label: "Completed", value: stats.completed, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
            { key: "cancelled", label: "Cancelled", value: stats.cancelled, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            { key: "rejected", label: "Rejected", value: stats.rejected, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
          ].map((s) => {
            const active = statusFilter === s.key;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setStatusFilter(s.key)}
                style={{
                  background: active ? s.bg : "#fff",
                  borderRadius: "14px",
                  padding: "18px",
                  textAlign: "center",
                  border: active ? `2px solid ${s.color}` : `1px solid ${s.border}`,
                  boxShadow: active
                    ? "0 8px 20px rgba(37,99,235,0.16)"
                    : "0 2px 10px rgba(37,99,235,0.06)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: s.color }}>{s.value}</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: active ? s.color : "#94a3b8", fontWeight: active ? "700" : "500" }}>{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* ── FILTERS ── */}
        {appointments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {filterButtons.map((filter) => {
              const active = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  style={{
                    border: active ? "none" : "1px solid #bfdbfe",
                    background: active ? "linear-gradient(135deg,#2563eb,#38bdf8)" : "#eff6ff",
                    color: active ? "#fff" : "#1e3a8a",
                    borderRadius: "999px",
                    padding: "7px 12px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {filter.label} ({filter.count})
                </button>
              );
            })}
          </div>
        )}

        {/* ── APPOINTMENTS LIST ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {appointments.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: "16px", padding: "48px",
              textAlign: "center", border: "1px solid #dbeafe",
            }}>
              <ClipboardList size={36} style={{ color: "#bfdbfe", margin: "0 auto 10px" }} />
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>No appointments yet.</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: "16px", padding: "48px",
              textAlign: "center", border: "1px solid #dbeafe",
            }}>
              <ClipboardList size={36} style={{ color: "#bfdbfe", margin: "0 auto 10px" }} />
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
                No {statusFilter} appointments found.
              </p>
            </div>
          ) : (
            filteredAppointments.map((appt) => {
              const sc = statusStyle(appt.status);
              return (
                <div key={appt._id} style={{
                  background: "#fff", borderRadius: "16px",
                  padding: "20px", border: "1px solid #dbeafe",
                  boxShadow: "0 2px 14px rgba(37,99,235,0.06)",
                  transition: "box-shadow 0.15s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.12)"}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 14px rgba(37,99,235,0.06)"}
                >
                  <div style={{ display: "flex", gap: "14px" }}>
                    <DoctorAvatar doctor={appt.doctor} size="w-14 h-14" />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                            Dr. {formatDoctorName(appt.doctor?.user?.name || appt.doctorName)}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#2563eb", fontWeight: "500" }}>
                            {appt.doctor?.specialization}
                          </p>
                        </div>
                        <span style={{
                          padding: "4px 12px", borderRadius: "20px", fontSize: "11px",
                          fontWeight: "700", textTransform: "capitalize", whiteSpace: "nowrap",
                          color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                        }}>
                          {appt.status?.replaceAll("-", " ")}
                        </span>
                      </div>

                      {/* Date & time */}
                      <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#64748b" }}>
                          <Calendar size={13} style={{ color: "#60a5fa" }} /> {appt.date}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#64748b" }}>
                          <Clock size={13} style={{ color: "#60a5fa" }} /> {appt.time}
                        </span>
                      </div>

                      {/* Timeline */}
                      {timeline(appt.status)}

                      {String(appt.status || "").toLowerCase() === "cancelled" && appt.cancellationReason && (
                        <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#b45309", fontWeight: "500" }}>
                          Cancellation reason: {appt.cancellationReason}
                        </p>
                      )}

                      {/* 🔄 Rescheduled-by-patient → show awaiting re-approval notice */}
                      {String(appt.status || "").toLowerCase() === "pending" && appt.rescheduledByPatient && (
                        <div style={{
                          marginTop: 10, padding: "8px 14px", borderRadius: 10,
                          background: "#fffbeb", border: "1px solid #fde68a",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                            ⏳ Rescheduled — Awaiting doctor re-approval for the new slot.
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
                        {canShowCheckIn(appt) && (
                          <button
                            onClick={() => markArrived(appt._id)}
                            style={{
                              padding: "8px 16px", borderRadius: "10px", border: "none",
                              background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                              color: "#fff", fontSize: "13px", fontWeight: "600",
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                              boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                            }}
                          >
                            <CheckCircle2 size={14} /> Mark as Arrived
                          </button>
                        )}

                        {/* 🎟️ LIVE QUEUE: Show on approved/arrived/in-consultation for today */}
                        {["approved", "arrived", "consultation-started"].includes(appt.status) &&
                          appt.date === new Date().toISOString().slice(0, 10) && (
                          <button
                            onClick={() => {
                              const doctorId = appt.doctor?._id || appt.doctorId;
                              navigate(`/patient/queue/${doctorId}/${appt.date}`);
                            }}
                            style={{
                              padding: "8px 16px", borderRadius: "10px",
                              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                              border: "none",
                              color: "#fff", fontSize: "13px", fontWeight: "600",
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                            }}
                          >
                            <Activity size={14} /> Live Queue
                            {appt.tokenNumber && (
                              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "999px", padding: "1px 7px", fontSize: "11px" }}>
                                #{appt.tokenNumber}
                              </span>
                            )}
                          </button>
                        )}

                        {["pending", "approved", "rescheduled"].includes(appt.status) && (
                          <button
                            onClick={() => openRescheduleModal(appt)}
                            style={{
                              padding: "8px 16px", borderRadius: "10px",
                              background: "#f0f9ff", border: "1px solid #bae6fd",
                              color: "#0284c7", fontSize: "13px", fontWeight: "600",
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#e0f2fe"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#f0f9ff"}
                          >
                            <Calendar size={14} /> Reschedule
                          </button>
                        )}

                        {["pending", "approved", "rescheduled"].includes(appt.status) && (
                          <button
                            onClick={() => setConfirmDialog({ isOpen: true, appointmentId: appt._id, action: "cancel" })}
                            style={{
                              padding: "8px 16px", borderRadius: "10px",
                              background: "#fef2f2", border: "1px solid #fecaca",
                              color: "#dc2626", fontSize: "13px", fontWeight: "600",
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#fee2e2"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#fef2f2"}
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        )}

                        {["consultation-completed", "completed"].includes(appt.status) && (<>
                          <button
                            onClick={() => viewPrescription(appt._id)}
                            style={{
                              padding: "8px 16px", borderRadius: "10px",
                              background: "#eff6ff", border: "1px solid #bfdbfe",
                              color: "#2563eb", fontSize: "13px", fontWeight: "600",
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#dbeafe"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#eff6ff"}
                          >
                            <FileText size={14} /> View Prescription
                          </button>

                          <button
                            onClick={() => downloadPrescription(appt._id)}
                            style={{
                              padding: "8px 16px", borderRadius: "10px",
                              background: "#f0fdf4", border: "1px solid #bbf7d0",
                              color: "#16a34a", fontSize: "13px", fontWeight: "600",
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#dcfce7"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#f0fdf4"}
                          >
                            <Download size={14} /> PDF
                          </button>

                          <button
                            onClick={() => openRebookModal(appt)}
                            style={{
                              padding: "8px 16px", borderRadius: "10px",
                              background: "#f5f3ff", border: "1px solid #ddd6fe",
                              color: "#7c3aed", fontSize: "13px", fontWeight: "600",
                              cursor: "pointer", transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#ede9fe"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#f5f3ff"}
                          >
                            Rebook Follow-up
                          </button>

                          {!appt.review && (
                            <button
                              onClick={() => setReviewModal({ open: true, appointmentId: appt._id, rating: 5, comment: "" })}
                              style={{
                                padding: "8px 16px", borderRadius: "10px",
                                background: "#fffbeb", border: "1px solid #fde68a",
                                color: "#d97706", fontSize: "13px", fontWeight: "600",
                                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#fef3c7"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "#fffbeb"}
                            >
                              <Star size={14} /> Rate
                            </button>
                          )}
                        </>)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── PRESCRIPTION MODAL ── */}
      {selectedPrescription && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          backdropFilter: "blur(4px)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{
            width: "100%", maxWidth: "560px", background: "#fff",
            borderRadius: "20px", padding: "28px", maxHeight: "90vh",
            overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            border: "1px solid #dbeafe",
            fontFamily: "'DM Sans','Segoe UI',sans-serif",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}>
                  <FileText size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e3a5f" }}>Prescription</h3>
                  <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Version {selectedPrescription.version}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrescription(null)}
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  border: "1px solid #dbeafe", background: "#f8faff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#64748b",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* 💡 Patient-Friendly Summary */}
            {selectedPrescription.patientSummary && (
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  border: "1.5px solid #a7f3d0",
                  marginBottom: "16px",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.08)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "14px" }}>💡</span>
                  <p style={{ margin: 0, fontSize: "11.5px", fontWeight: "800", color: "#065f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    How to Take Your Medicine (Simple Guide)
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#047857", fontWeight: "600", lineHeight: "1.5" }}>
                  {selectedPrescription.patientSummary}
                </p>
              </div>
            )}

            {/* Diagnosis */}
            <div style={{
              background: "#eff6ff", borderRadius: "12px",
              padding: "14px 16px", border: "1px solid #bfdbfe", marginBottom: "16px",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Diagnosis</p>
              <p style={{ margin: 0, fontSize: "14px", color: "#1e3a5f", fontWeight: "500" }}>{selectedPrescription.diagnosis || "N/A"}</p>
            </div>

            {/* Medicines */}
            {selectedPrescription.medicines?.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <Pill size={14} style={{ color: "#2563eb" }} />
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>Medicines</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedPrescription.medicines.map((m, i) => (
                    <div key={i} style={{
                      padding: "12px 14px", borderRadius: "10px",
                      background: "#f8faff", border: "1px solid #dbeafe",
                      display: "flex", alignItems: "center", gap: "10px",
                    }}>
                      <div style={{
                        width: "26px", height: "26px", borderRadius: "8px",
                        background: "#eff6ff", border: "1px solid #bfdbfe",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#2563eb", fontSize: "11px", fontWeight: "700", flexShrink: 0,
                      }}>{i + 1}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>{m.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{m.dosage} · {m.frequency} · {m.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advice */}
            {selectedPrescription.advice && (
              <div style={{
                background: "#fffbeb", borderRadius: "10px",
                padding: "12px 14px", border: "1px solid #fde68a", marginBottom: "20px",
              }}>
                <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em" }}>Advice</p>
                <p style={{ margin: 0, fontSize: "13px", color: "#78350f" }}>{selectedPrescription.advice}</p>
              </div>
            )}

            <button
              onClick={() => setSelectedPrescription(null)}
              style={{
                width: "100%", padding: "12px", borderRadius: "12px",
                background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                color: "#fff", fontSize: "14px", fontWeight: "700",
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {reviewModal.open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          backdropFilter: "blur(4px)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{
            width: "100%", maxWidth: "440px", background: "#fff",
            borderRadius: "20px", padding: "28px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            border: "1px solid #dbeafe",
            fontFamily: "'DM Sans','Segoe UI',sans-serif",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "linear-gradient(135deg,#f59e0b,#fbbf24)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}>
                  <Star size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e3a5f" }}>Rate Your Visit</h3>
                  <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Share your experience</p>
                </div>
              </div>
              <button
                onClick={() => setReviewModal({ open: false, appointmentId: null, rating: 5, comment: "" })}
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  border: "1px solid #dbeafe", background: "#f8faff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#64748b",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Stars */}
            <div style={{ marginBottom: "18px" }}>
              <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>Rating</p>
              <div style={{ display: "flex", gap: "8px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewModal((p) => ({ ...p, rating: star }))}
                    style={{
                      width: "42px", height: "42px", borderRadius: "10px",
                      border: star <= reviewModal.rating ? "none" : "1px solid #dbeafe",
                      background: star <= reviewModal.rating
                        ? "linear-gradient(135deg,#f59e0b,#fbbf24)"
                        : "#f8faff",
                      color: star <= reviewModal.rating ? "#fff" : "#94a3b8",
                      fontSize: "18px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: star <= reviewModal.rating ? "0 2px 8px rgba(245,158,11,0.3)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: "20px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>Comment</p>
              <textarea
                rows={3}
                placeholder="Share your experience..."
                value={reviewModal.comment}
                onChange={(e) => setReviewModal((p) => ({ ...p, comment: e.target.value }))}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "12px",
                  border: "1px solid #dbeafe", background: "#f8faff",
                  fontSize: "13px", color: "#1e3a5f", resize: "none",
                  outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setReviewModal({ open: false, appointmentId: null, rating: 5, comment: "" })}
                style={{
                  flex: 1, padding: "12px", borderRadius: "12px",
                  border: "1px solid #dbeafe", background: "#f8faff",
                  color: "#64748b", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                style={{
                  flex: 2, padding: "12px", borderRadius: "12px",
                  background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                  color: "#fff", fontSize: "14px", fontWeight: "700",
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                }}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESCHEDULE MODAL ── */}
      {rescheduleModal.open && rescheduleModal.appointment && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          backdropFilter: "blur(4px)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{
            width: "100%", maxWidth: "520px", background: "#fff",
            borderRadius: "20px", padding: "28px", maxHeight: "90vh",
            overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            border: "1px solid #dbeafe",
            fontFamily: "'DM Sans','Segoe UI',sans-serif",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", flexShrink: 0,
                }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e3a5f" }}>
                    {rescheduleModal.mode === "rebook" ? "Rebook Follow-up" : "Reschedule Appointment"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Select a new date and available time slot
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModal({ open: false, appointment: null, date: "", slotId: "", slots: [], loadingSlots: false, submitting: false, mode: "reschedule" })}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Details */}
            <div style={{ background: "#f8faff", borderRadius: "12px", padding: "12px 16px", border: "1px solid #e2e8f0", marginBottom: "18px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>
                Dr. {formatDoctorName(rescheduleModal.appointment.doctor?.user?.name || rescheduleModal.appointment.doctor?.name)}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Current schedule: <b>{rescheduleModal.appointment.date}</b> at <b>{rescheduleModal.appointment.time}</b>
              </div>
            </div>

            {/* Date Picker */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
                Select New Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={rescheduleModal.date}
                onChange={(e) => handleRescheduleDateChange(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  border: "1px solid #cbd5e1", fontSize: "14px", color: "#1e293b",
                  outline: "none", boxSizing: "border-box", background: "#fff"
                }}
              />
            </div>

            {/* Slots */}
            <div style={{ marginBottom: "22px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
                Available Time Slots
              </label>
              {rescheduleModal.loadingSlots ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", color: "#0284c7", gap: "8px" }}>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: "13px" }}>Loading available slots...</span>
                </div>
              ) : rescheduleModal.slots.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: "13px" }}>
                  No available slots found for this date. Please pick another date.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px", maxHeight: "160px", overflowY: "auto" }}>
                  {rescheduleModal.slots.map((slot) => {
                    const isSelected = rescheduleModal.slotId === slot._id;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        onClick={() => setRescheduleModal((prev) => ({ ...prev, slotId: slot._id }))}
                        style={{
                          padding: "9px 12px", borderRadius: "10px",
                          border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                          background: isSelected ? "#e0f2fe" : "#fff",
                          color: isSelected ? "#0369a1" : "#334155",
                          fontWeight: isSelected ? "700" : "500",
                          fontSize: "13px", cursor: "pointer",
                          transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"
                        }}
                      >
                        <Clock size={12} /> {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRescheduleModal({ open: false, appointment: null, date: "", slotId: "", slots: [], loadingSlots: false, submitting: false, mode: "reschedule" })}
                style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduleModal.submitting || !rescheduleModal.slotId}
                onClick={handleConfirmReschedule}
                style={{
                  padding: "9px 20px", borderRadius: "10px", border: "none",
                  background: rescheduleModal.submitting || !rescheduleModal.slotId ? "#94a3b8" : "linear-gradient(135deg, #0284c7, #38bdf8)",
                  color: "#fff", fontWeight: "600", fontSize: "13px",
                  cursor: rescheduleModal.submitting || !rescheduleModal.slotId ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "6px"
                }}
              >
                {rescheduleModal.submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Calendar size={14} />}
                {rescheduleModal.mode === "rebook" ? "Book Follow-up" : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        onConfirm={() => {
          cancelAppointment(confirmDialog.appointmentId);
          setConfirmDialog({ isOpen: false, appointmentId: null, action: null });
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, appointmentId: null, action: null })}
      />
    </div>
  );
}
