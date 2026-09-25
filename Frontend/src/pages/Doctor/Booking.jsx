import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Calendar, CheckCircle2, Clock3, FileText, Loader2,
  Stethoscope, XCircle, ChevronRight, Plus, Trash2,
  User, Mail, Star, ClipboardList, Pill, FlaskConical,
  MessageSquare, AlertTriangle, Activity, Download, History, Clock, Users,
  ShieldAlert, Heart, TrendingUp, TrendingDown, ChevronDown, ChevronUp
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from "recharts";
import API from "../util/api";
import { showToast } from "../../Redux/toastSlice";
import { getSocket } from "../../utils/socket";
import ConfirmDialog from "../../Componet/ConfirmDialog";
import VoiceScribeWidget from "../../Componet/VoiceScribeWidget";

/* ─── Style injection ─────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  :root {
    --azure: #1a6bff;
    --azure-mid: #4d8dff;
    --azure-pale: #e8f0ff;
    --azure-deep: #0a3d99;
    --ice: #f0f6ff;
    --slate: #1e2d4a;
    --mist: #6b7fa8;
    --line: #dde7f5;
    --white: #ffffff;
    --success: #0e9f6e;
    --warn: #f59e0b;
    --danger: #ef4444;
    --indigo: #6366f1;
  }

  .db-root * { box-sizing: border-box; }
  .db-root { font-family: 'DM Sans', sans-serif; background: var(--ice); min-height: 100vh; }

  /* ── Skeleton ── */
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, #e2eaf5 25%, #f0f5ff 50%, #e2eaf5 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 8px;
  }

  /* ── Cards ── */
  .appt-card {
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(26,107,255,.06);
    transition: box-shadow .2s, transform .2s;
  }
  .appt-card:hover { box-shadow: 0 6px 24px rgba(26,107,255,.13); transform: translateY(-2px); }

  /* ── Status pills ── */
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 13px; border-radius: 999px; font-size: 13px; font-weight: 600;
    letter-spacing: .03em; text-transform: capitalize; white-space: nowrap;
  }
  .pill-pending  { background: #fff7e0; color: #b45309; border: 1px solid #fcd34d; }
  .pill-approved { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
  .pill-arrived  { background: #cffafe; color: #0e7490; border: 1px solid #67e8f9; }
  .pill-started  { background: #ede9fe; color: #6d28d9; border: 1px solid #c4b5fd; }
  .pill-completed{ background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
  .pill-cancelled,.pill-rejected { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
  .pill-noshow   { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }

  /* ── Timeline ── */
  .timeline { display: flex; align-items: center; gap: 4px; margin-top: 14px; overflow-x: auto; padding-bottom: 2px; }
  .tl-step {
    display: flex; align-items: center; gap: 4px;
  }
  .tl-node {
    font-size: 12px; padding: 4px 11px; border-radius: 999px; white-space: nowrap;
    font-weight: 500; letter-spacing: .02em;
  }
  .tl-node.active  { background: var(--azure); color: #fff; }
  .tl-node.inactive{ background: #eaf0fa; color: var(--mist); }
  .tl-arrow { color: #c5d3ea; font-size: 10px; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 11px 20px; border-radius: 10px; font-size: 15px; font-weight: 600;
    cursor: pointer; border: none; transition: all .18s; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
  }
  .btn:disabled { opacity: .55; cursor: not-allowed; }
  .btn-primary   { background: var(--azure); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--azure-deep); }
  .btn-danger    { background: #fee2e2; color: var(--danger); }
  .btn-danger:hover:not(:disabled) { background: #fecaca; }
  .btn-warn      { background: #fff3e0; color: #c2410c; }
  .btn-warn:hover:not(:disabled) { background: #ffe4c4; }
  .btn-indigo    { background: var(--indigo); color: #fff; }
  .btn-indigo:hover:not(:disabled) { background: #4f46e5; }
  .btn-success   { background: var(--success); color: #fff; }
  .btn-success:hover:not(:disabled) { background: #047857; }
  .btn-ghost     { background: transparent; color: var(--azure); border: 1px solid var(--line); }
  .btn-ghost:hover { background: var(--azure-pale); }
  .btn-clinical  {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 14px; font-weight: 600; color: var(--azure);
    background: var(--azure-pale); border: none; border-radius: 8px;
    padding: 7px 13px; cursor: pointer; transition: background .15s;
    font-family: 'DM Sans', sans-serif;
  }
  .btn-clinical:hover { background: #d0e2ff; }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(10,40,100,.22);
    backdrop-filter: blur(6px); z-index: 50;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal {
    width: 100%; max-width: 880px; background: var(--white);
    border-radius: 20px; box-shadow: 0 24px 64px rgba(10,40,100,.18);
    max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  }
  .modal-header {
    padding: 20px 24px; border-bottom: 1px solid var(--line);
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg, var(--azure-deep) 0%, var(--azure) 100%);
    border-radius: 20px 20px 0 0;
  }
  .modal-header h2 { color: #fff; font-family: 'DM Serif Display', serif; font-size: 23px; font-weight: 400; display: flex; align-items: center; gap: 8px; }
  .modal-close { background: rgba(255,255,255,.18); border: none; border-radius: 8px; padding: 6px; cursor: pointer; color: #fff; display: flex; transition: background .15s; }
  .modal-close:hover { background: rgba(255,255,255,.32); }
  .modal-body { overflow-y: auto; padding: 24px; flex: 1; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; gap: 10px; background: #fafcff; border-radius: 0 0 20px 20px; }

  /* ── Form elements ── */
  .field-label { font-size: 13px; font-weight: 600; color: var(--mist); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px; }
  .field {
    width: 100%; border: 1.5px solid var(--line); border-radius: 10px;
    padding: 13px 15px; font-size: 15px; font-family: 'DM Sans', sans-serif;
    color: var(--slate); background: var(--white); outline: none;
    transition: border-color .18s, box-shadow .18s; resize: vertical;
  }
  .field:focus { border-color: var(--azure); box-shadow: 0 0 0 3px rgba(26,107,255,.12); }
  .field::placeholder { color: #adbcda; }

  /* ── Med card ── */
  .med-card {
    border: 1.5px solid var(--line); border-radius: 12px; padding: 14px;
    background: linear-gradient(135deg, #f7faff, #eef4ff);
    position: relative;
  }

  /* ── Section divider ── */
  .section-head {
    display: flex; align-items: center; gap: 8px;
    font-family: 'DM Serif Display', serif; font-size: 20px; font-weight: 400;
    color: var(--slate); margin-bottom: 14px;
  }
  .section-head svg { color: var(--azure); }

  /* ── Date header ── */
  .date-header {
    display: flex; align-items: center; gap: 8px;
    color: var(--azure-deep); font-weight: 600; font-size: 15px;
    text-transform: uppercase; letter-spacing: .08em; margin-bottom: 14px;
  }

  /* ── Page header ── */
  .page-header {
    background: linear-gradient(135deg, var(--azure-deep) 0%, #1a6bff 60%, #4d8dff 100%);
    border-radius: 20px; padding: 28px 32px; margin-bottom: 28px;
    position: relative; overflow: hidden;
  }
  .page-header::before {
    content: ''; position: absolute; right: -40px; top: -40px;
    width: 200px; height: 200px; border-radius: 50%;
    background: rgba(255,255,255,.07);
  }
  .page-header::after {
    content: ''; position: absolute; right: 60px; bottom: -60px;
    width: 140px; height: 140px; border-radius: 50%;
    background: rgba(255,255,255,.05);
  }
  .page-header h1 {
    font-family: 'DM Serif Display', serif; font-size: 34px; font-weight: 400;
    color: #fff; margin: 0 0 8px;
  }
  .page-header p { color: rgba(255,255,255,.75); font-size: 15px; margin: 0; }

  /* ── Review badge ── */
  .review-badge {
    display: flex; align-items: center; gap: 5px; margin-top: 10px;
    background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
    padding: 6px 12px; font-size: 13px; color: #92400e;
  }

  /* ── Completed badge ── */
  .completed-badge {
    display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px;
    background: #d1fae5; color: #065f46; border-radius: 10px; font-size: 14px; font-weight: 600;
  }

  /* ── Empty state ── */
  .empty-state {
    background: var(--white); border: 1.5px dashed var(--line); border-radius: 20px;
    padding: 56px 24px; text-align: center; margin-top: 8px;
  }
  .empty-icon { width: 56px; height: 56px; background: var(--azure-pale); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }

  /* ── Tab switcher in modal ── */
  .tab-bar { display: flex; gap: 4px; background: var(--azure-pale); border-radius: 10px; padding: 4px; margin-bottom: 18px; }
  .tab-btn {
    flex: 1; padding: 10px 14px; border: none; border-radius: 7px; font-size: 15px; font-weight: 500;
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .18s;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .tab-btn.active { background: var(--white); color: var(--azure); box-shadow: 0 2px 8px rgba(26,107,255,.12); font-weight: 600; }
  .tab-btn.inactive { background: transparent; color: var(--mist); }

  /* ── Grid ── */
  .appt-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .modal-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 700px) { .modal-grid { grid-template-columns: 1fr 1fr; } }
`;

/* ─── Constants ──────────────────────────────────────────── */
const FLOW = ["pending", "approved", "arrived", "consultation-started", "consultation-completed"];
const emptyMedicine = () => ({ name: "", dosage: "", frequency: "", duration: "", instructions: "" });
const emptyNotes = { symptomsObserved: "", clinicalObservations: "", suggestedTests: "", internalRemarks: "" };

/* ─── Skeleton loader ────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="appt-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="skeleton" style={{ width: 140, height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 180, height: 12 }} />
        </div>
        <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={{ width: "100%", height: 10, marginTop: 4 }} />
      <div className="skeleton" style={{ width: "70%", height: 10 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <div className="skeleton" style={{ width: 90, height: 34, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 80, height: 34, borderRadius: 10 }} />
      </div>
    </div>
  );
}

/* ─── Status pill ────────────────────────────────────────── */
function StatusPill({ status }) {
  const safeStatus = status === "no-show" ? "cancelled" : status;

  const cls = {
    pending: "pill-pending", approved: "pill-approved", arrived: "pill-arrived",
    "consultation-started": "pill-started", "consultation-completed": "pill-completed",
    cancelled: "pill-cancelled", rejected: "pill-rejected"
  }[safeStatus] || "";

  const dot = { pending: "#f59e0b", approved: "#3b82f6", arrived: "#06b6d4", "consultation-started": "#6366f1", "consultation-completed": "#0e9f6e", cancelled: "#ef4444", rejected: "#ef4444" }[safeStatus] || "#94a3b8";

  return (
    <span className={`pill ${cls}`}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {safeStatus.replaceAll("-", " ")}
    </span>
  );
}

/* ─── Timeline ───────────────────────────────────────────── */
function Timeline({ status }) {
  const index = FLOW.indexOf(status);
  return (
    <div className="timeline">
      {FLOW.map((item, idx) => (
        <div key={item} className="tl-step">
          <span className={`tl-node ${idx <= index ? "active" : "inactive"}`}>{item.replaceAll("-", " ")}</span>
          {idx < FLOW.length - 1 && <ChevronRight size={10} className="tl-arrow" />}
        </div>
      ))}
    </div>
  );
}

/* ─── Field helpers ──────────────────────────────────────── */
function Field({ label, children, style }) {
  return (
    <div style={style}>
      {label && <p className="field-label">{label}</p>}
      {children}
    </div>
  );
}

/* ─── Live Consultation Timer Component ─────────────────── */
function LiveConsultationTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startMs = startTime ? new Date(startTime).getTime() : Date.now();
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsed(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  const formatted = hrs > 0
    ? `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "#fdf2f8",
      color: "#db2777",
      border: "1px solid #fbcfe8",
      borderRadius: "999px",
      padding: "4px 12px",
      fontSize: "12.5px",
      fontWeight: "700",
      letterSpacing: "0.02em",
      boxShadow: "0 2px 8px rgba(219, 39, 119, 0.12)"
    }}>
      <span style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: "#ec4899",
        display: "inline-block",
        boxShadow: "0 0 6px #ec4899"
      }} />
      <span>⏱️ Live: {formatted}</span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function DoctorBookings() {
  const dispatch = useDispatch();

  const getAppointmentTimestamp = useCallback((item = {}) => {
    const datePart = String(item?.date || "").trim();
    const timePart = String(item?.time || "").trim();

    if (datePart && timePart) {
      const combined = new Date(`${datePart} ${timePart}`);
      if (!Number.isNaN(combined.getTime())) return combined.getTime();
    }

    if (datePart) {
      const dateOnly = new Date(datePart);
      if (!Number.isNaN(dateOnly.getTime())) return dateOnly.getTime();
    }

    return 0;
  }, []);

  const sortByUpcomingDateTime = useCallback((a, b) => {
    const nowTs = Date.now();
    const aTs = getAppointmentTimestamp(a);
    const bTs = getAppointmentTimestamp(b);

    const aIsUpcoming = aTs >= nowTs;
    const bIsUpcoming = bTs >= nowTs;

    if (aIsUpcoming && !bIsUpcoming) return -1;
    if (!aIsUpcoming && bIsUpcoming) return 1;

    if (aIsUpcoming && bIsUpcoming) {
      return aTs - bTs;
    }

    return bTs - aTs;
  }, [getAppointmentTimestamp]);

  const [bookings, setBookings] = useState([]);
  const bookingsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("prescription");
  const [prescription, setPrescription] = useState({ diagnosis: "", medicines: [emptyMedicine()], advice: "", followUpDate: "" });
  const [doctorNotes, setDoctorNotes] = useState(emptyNotes);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState({ id: null, type: null });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, appointmentId: null, action: null, endpoint: null });
  const [messageModal, setMessageModal] = useState({ open: false, appointment: null, subject: "", body: "" });
  const [messageSending, setMessageSending] = useState(false);
  const [cancelDialog, setCancelDialog] = useState({ open: false, appointment: null, reason: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false,
    appointment: null,
    date: "",
    slotId: "",
    slots: [],
    loadingSlots: false,
    submitting: false,
  });

  // 🎟️ QUEUE: Today's queue overview for the doctor
  const [queueState, setQueueState] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  // 🛡️ Safety conflict alert modal
  const [safetyConflictModal, setSafetyConflictModal] = useState({
    isOpen: false,
    conflicts: [],
    patientAllergies: "",
    patientName: "",
    overrideReason: ""
  });

  // ❤️ Pre-Consult AI Vitals Brief
  const [preConsultBrief, setPreConsultBrief] = useState(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [showVitalsChart, setShowVitalsChart] = useState(false);
  const [patientVitalsHistory, setPatientVitalsHistory] = useState([]);

  const downloadPrescription = async (appointmentId) => {
    try {
      const response = await API.get(`/appointments/${appointmentId}/prescription/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `prescription-${appointmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      dispatch(showToast({ message: "Prescription PDF downloaded", type: "success" }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || "Failed to download prescription PDF", type: "error" }));
    }
  };

  const openReschedule = (item) => {
    const today = new Date().toISOString().split("T")[0];
    const initialDate = item.date || today;
    const docId = item.doctorId || item.doctor?._id || item.doctor;
    setRescheduleModal({
      open: true,
      appointment: item,
      date: initialDate,
      slotId: "",
      slots: [],
      loadingSlots: true,
      submitting: false,
    });
    fetchDoctorSlots(docId, initialDate);
  };

  const fetchDoctorSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setRescheduleModal((p) => ({ ...p, loadingSlots: true, slots: [], slotId: "" }));
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

      setRescheduleModal((p) => ({ ...p, slots, loadingSlots: false }));
    } catch {
      setRescheduleModal((p) => ({ ...p, loadingSlots: false }));
    }
  };

  const handleDoctorRescheduleDateChange = (newDate) => {
    setRescheduleModal((p) => ({ ...p, date: newDate }));
    const docId = rescheduleModal.appointment?.doctorId || rescheduleModal.appointment?.doctor?._id || rescheduleModal.appointment?.doctor;
    fetchDoctorSlots(docId, newDate);
  };

  const handleDoctorConfirmReschedule = async () => {
    if (!rescheduleModal.slotId) {
      dispatch(showToast({ message: "Please select an available time slot", type: "warning" }));
      return;
    }
    setRescheduleModal((p) => ({ ...p, submitting: true }));
    try {
      const selectedSlot = rescheduleModal.slots.find((s) => s._id === rescheduleModal.slotId);
      await API.put(`/appointments/${rescheduleModal.appointment._id}/reschedule`, {
        slotId: rescheduleModal.slotId,
        date: rescheduleModal.date,
        time: selectedSlot?.startTime,
      });
      dispatch(showToast({ message: "Appointment rescheduled successfully!", type: "success" }));
      setRescheduleModal({ open: false, appointment: null, date: "", slotId: "", slots: [], loadingSlots: false, submitting: false });
      fetchBookings();
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || err.response?.data?.error || "Failed to reschedule", type: "error" }));
      setRescheduleModal((p) => ({ ...p, submitting: false }));
    }
  };

  // 🎟️ QUEUE: Fetch today's queue state for the doctor
  const fetchTodayQueue = useCallback(async (currentBookings) => {
    try {
      setQueueLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const list = Array.isArray(currentBookings) ? currentBookings : bookingsRef.current;
      const firstDoc = list?.find((b) => b.doctor?._id || b.doctorId);
      const docIdFromBooking = firstDoc?.doctor?._id || firstDoc?.doctorId;
      const auth = JSON.parse(localStorage.getItem("auth") || "{}");
      const doctorId = docIdFromBooking || auth?.user?.doctorId || auth?.user?._id;
      if (!doctorId) return;
      const { data } = await API.get(`/queue/${doctorId}/${today}`);
      setQueueState(data);
    } catch (err) {
      console.warn("[DoctorBooking] queue fetch failed:", err.message);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/appointments/doctor");
      const appts = Array.isArray(data) ? data : [];
      bookingsRef.current = appts;
      setBookings(appts);
      fetchTodayQueue(appts);
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Failed to load appointments", type: "error" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchTodayQueue]);

  useEffect(() => {
    fetchBookings();
    const socket = getSocket();
    socket.on("appointmentStatusUpdate", fetchBookings);
    // 🎟️ QUEUE: Update queue panel in real time when queue changes
    const handleQueueUpdated = (data) => {
      const today = new Date().toISOString().slice(0, 10);
      if (data?.date === today) setQueueState(data);
    };
    socket.on("queue_updated", handleQueueUpdated);
    return () => {
      socket.off("appointmentStatusUpdate", fetchBookings);
      socket.off("queue_updated", handleQueueUpdated);
    };
  }, [fetchBookings]);


  const normalizeStatusForFilter = useCallback((status) => {
    const value = String(status || "").toLowerCase();
    if (value === "consultation-completed") return "completed";
    if (value === "no-show") return "rejected";
    return value;
  }, []);

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") return bookings;
    return bookings.filter((booking) => normalizeStatusForFilter(booking?.status) === statusFilter);
  }, [bookings, statusFilter, normalizeStatusForFilter]);

  const { grouped, sortedDateKeys } = useMemo(() => {
    const groupedMap = filteredBookings.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});

    const keys = Object.keys(groupedMap).sort((a, b) =>
      sortByUpcomingDateTime(
        { date: a, time: "00:00" },
        { date: b, time: "00:00" }
      )
    );

    keys.forEach((dateKey) => {
      groupedMap[dateKey] = [...groupedMap[dateKey]].sort(sortByUpcomingDateTime);
    });

    return { grouped: groupedMap, sortedDateKeys: keys };
  }, [filteredBookings, sortByUpcomingDateTime]);

  const openClinical = async (appointment) => {
    setSelected(appointment);
    setActiveTab("prescription");
    setPreConsultBrief(null);
    setLoadingBrief(true);
    setShowVitalsChart(false);

    const patientId = appointment.patientId?._id || appointment.patientId || appointment.patient?._id || appointment.patient;

    try {
      const [presRes, noteRes, briefRes, vitalsRes] = await Promise.allSettled([
        API.get(`/appointments/${appointment._id}/prescription`),
        API.get(`/appointments/${appointment._id}/notes`),
        patientId ? API.get(`/vitals/patient/${patientId}/pre-consult-brief`) : Promise.reject("No patientId"),
        patientId ? API.get(`/vitals/patient/${patientId}`) : Promise.reject("No patientId")
      ]);
      if (presRes.status === "fulfilled") {
        const p = presRes.value.data;
        setPrescription({
          diagnosis: p.diagnosis || "",
          medicines: p.medicines?.length ? p.medicines : [emptyMedicine()],
          advice: p.advice || "",
          followUpDate: p.followUpDate ? p.followUpDate.slice(0, 10) : "",
          version: p.version || 1,
          versionHistory: p.versionHistory || []
        });
      } else {
        setPrescription({ diagnosis: "", medicines: [emptyMedicine()], advice: "", followUpDate: "", version: 1, versionHistory: [] });
      }
      if (noteRes.status === "fulfilled") {
        const n = noteRes.value.data;
        setDoctorNotes({ symptomsObserved: n.symptomsObserved || "", clinicalObservations: n.clinicalObservations || "", suggestedTests: n.suggestedTests || "", internalRemarks: n.internalRemarks || "" });
      } else {
        setDoctorNotes(emptyNotes);
      }
      if (briefRes.status === "fulfilled") {
        setPreConsultBrief(briefRes.value.data);
      }
      if (vitalsRes.status === "fulfilled") {
        setPatientVitalsHistory(vitalsRes.value.data?.vitals || []);
      }
    } catch {
      setPrescription({ diagnosis: "", medicines: [emptyMedicine()], advice: "", followUpDate: "" });
      setDoctorNotes(emptyNotes);
    } finally {
      setLoadingBrief(false);
    }
  };

  const openMessage = (appointment) => {
    setMessageModal({
      open: true,
      appointment,
      subject: "Appointment Update",
      body: "",
    });
  };

  const sendMessage = async () => {
    if (!messageModal.appointment?._id) return;
    if (!messageModal.body.trim()) {
      dispatch(showToast({ message: "Please enter a message", type: "warning" }));
      return;
    }
    try {
      setMessageSending(true);
      await API.post("/doctors/messages", {
        appointmentId: messageModal.appointment._id,
        subject: messageModal.subject,
        message: messageModal.body,
      });
      dispatch(showToast({ message: "Message sent to patient", type: "success" }));
      setMessageModal({ open: false, appointment: null, subject: "", body: "" });
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Failed to send message", type: "error" }));
    } finally {
      setMessageSending(false);
    }
  };

  const openCancel = (appointment) => {
    setCancelDialog({ open: true, appointment, reason: "" });
  };

  const submitCancel = async () => {
    if (!cancelDialog.appointment?._id) return;
    const reason = String(cancelDialog.reason || "").trim() || "Cancelled by doctor";
    try {
      setActionLoading({ id: cancelDialog.appointment._id, type: "Cancel" });
      await API.put(`/appointments/${cancelDialog.appointment._id}`, { status: "cancelled", reason });
      dispatch(showToast({ message: "Appointment cancelled", type: "success" }));
      await fetchBookings();
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Cancellation failed", type: "error" }));
    } finally {
      setActionLoading({ id: null, type: null });
      setCancelDialog({ open: false, appointment: null, reason: "" });
    }
  };

  const askAction = (appointmentId, action, endpoint) => {
    setConfirmDialog({ isOpen: true, appointmentId, action, endpoint });
  };

  const executeAction = async () => {
    const { appointmentId, endpoint, action } = confirmDialog;
    try {
      setActionLoading({ id: appointmentId, type: action });
      await API.put(endpoint);
      dispatch(showToast({ message: `${action} successful`, type: "success" }));
      await fetchBookings();
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Action failed", type: "error" }));
    } finally {
      setActionLoading({ id: null, type: null });
      setConfirmDialog({ isOpen: false, appointmentId: null, action: null, endpoint: null });
    }
  };

  const saveClinicalData = async (options = {}) => {
    if (!selected) return;
    const { overrideSafetyCheck = false, overrideReason = "" } = options;
    try {
      setSaving(true);
      const payload = {
        ...prescription,
        overrideSafetyCheck,
        overrideReason
      };
      await API.post(`/appointments/${selected._id}/prescription`, payload);
      await API.post(`/appointments/${selected._id}/notes`, doctorNotes);
      dispatch(showToast({
        message: overrideSafetyCheck ? "✨ Prescription saved (Safety override applied)" : "Clinical data saved",
        type: "success"
      }));
      setSafetyConflictModal({ isOpen: false, conflicts: [], patientAllergies: "", patientName: "", overrideReason: "" });
      await fetchBookings();
      setSelected(null);
      setPrescription({ diagnosis: "", medicines: [emptyMedicine()], advice: "", followUpDate: "" });
      setDoctorNotes(emptyNotes);
    } catch (error) {
      if (error.response?.data?.status === "conflict_detected") {
        const rawConflicts = error.response.data.conflicts || [];
        const uniqueConflicts = [];
        const seenDrugs = new Set();
        for (const item of rawConflicts) {
          const key = String(item.medicineName || "")
            .toLowerCase()
            .replace(/\b(\d+(\.\d+)?\s*(mg|ml|g|mcg|tab|tablet|capsule|units)?)\b/gi, "")
            .replace(/[^a-z]/gi, "")
            .trim();
          if (!key || seenDrugs.has(key)) continue;
          seenDrugs.add(key);
          uniqueConflicts.push(item);
        }

        setSafetyConflictModal({
          isOpen: true,
          conflicts: uniqueConflicts,
          patientAllergies: error.response.data.patientAllergies || "None declared",
          patientName: error.response.data.patientName || selected.patient?.name || "Patient",
          overrideReason: ""
        });
      } else {
        dispatch(showToast({ message: error.response?.data?.message || "Failed to save clinical data", type: "error" }));
      }
    } finally {
      setSaving(false);
    }
  };

  const addMedicine = () => setPrescription((prev) => ({ ...prev, medicines: [...prev.medicines, emptyMedicine()] }));
  const removeMedicine = (index) => setPrescription((prev) => ({ ...prev, medicines: prev.medicines.filter((_, idx) => idx !== index) }));
  const updateMedicine = (index, key, value) => {
    setPrescription((prev) => ({ ...prev, medicines: prev.medicines.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)) }));
  };

  const formatDateLabel = (dateValue) => {
    if (!dateValue) return "";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);
    return parsed.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const bookingStats = useMemo(() => {
    return bookings.reduce(
      (acc, booking) => {
        const status = String(booking?.status || "").toLowerCase();

        if (status === "pending") acc.pending += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "arrived") acc.arrived += 1;
        if (status === "consultation-completed" || status === "completed") acc.completed += 1;
        if (status === "cancelled") acc.cancelled += 1;
        if (status === "rejected" || status === "no-show") acc.rejected += 1;
        if (status === "rescheduled") acc.rescheduled += 1;

        return acc;
      },
      { pending: 0, approved: 0, arrived: 0, completed: 0, cancelled: 0, rejected: 0, rescheduled: 0 }
    );
  }, [bookings]);

  const filterButtons = useMemo(() => ([
    { key: "all",         label: "All",         count: bookings.length },
    { key: "pending",     label: "Pending",     count: bookingStats.pending },
    { key: "approved",    label: "Approved",    count: bookingStats.approved },
    { key: "arrived",     label: "Arrived",     count: bookingStats.arrived },
    { key: "rescheduled", label: "Rescheduled", count: bookingStats.rescheduled },
    { key: "completed",   label: "Completed",   count: bookingStats.completed },
    { key: "cancelled",   label: "Cancelled",   count: bookingStats.cancelled },
    { key: "rejected",    label: "Rejected",    count: bookingStats.rejected },
  ]), [bookings.length, bookingStats]);

  const canCancel = (status) => ["pending", "approved", "arrived"].includes((status || "").toLowerCase());

  return (
    <>
      <style>{STYLES}</style>
      <div className="db-root">
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 48px" }}>

          {/* Page header */}
          <div className="page-header">
            <h1>Doctor Appointments</h1>
            <p>Status flow: Pending → Approved → Arrived → Consultation Started → Completed</p>
          </div>

          {/* 🎟️ QUEUE: Today's Live Queue Overview Panel */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => { setShowQueuePanel((p) => !p); fetchTodayQueue(); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: "linear-gradient(135deg,#ede9fe,#dbeafe)", border: "1.5px solid #c4b5fd",
                borderRadius: 14, padding: "12px 18px", cursor: "pointer",
                fontSize: 14, fontWeight: 700, color: "#4c1d95",
              }}
            >
              <Users size={18} color="#6d28d9" />
              Today&apos;s Live Queue
              {queueState && (
                <span style={{ marginLeft: 6, background: "#6366f1", color: "#fff", borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>
                  {queueState.queue?.filter(q => q.status !== "consultation-completed").length ?? 0} active
                </span>
              )}
              {queueState?.isDelayed && (
                <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>
                  ⚠ Running Late
                </span>
              )}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#6d28d9" }}>{showQueuePanel ? "▲ Hide" : "▼ Show"}</span>
            </button>

            {showQueuePanel && (
              <div style={{ background: "#fff", border: "1.5px solid #ddd6fe", borderTop: "none", borderRadius: "0 0 14px 14px", padding: "16px 18px" }}>
                {queueLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13 }}>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading queue…
                  </div>
                ) : !queueState || !queueState.queue?.length ? (
                  <p style={{ color: "#94a3b8", margin: 0, fontSize: 13, textAlign: "center" }}>No active appointments today</p>
                ) : (
                  <div>
                    {/* Delay warning */}
                    {queueState.isDelayed && (
                      <div style={{ background: "#fff7ed", border: "1px solid #fb923c", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: "#9a3412", fontWeight: 600 }}>
                          ⚠ Running {queueState.delayMinutes} min late · Avg consultation: {queueState.avgDurationMinutes} min
                        </span>
                      </div>
                    )}
                    {/* Queue rows */}
                    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto auto", gap: "8px 12px", alignItems: "center", fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase" }}>Token</span>
                      <span style={{ fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase" }}>Patient</span>
                      <span style={{ fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase" }}>Status</span>
                      <span style={{ fontWeight: 700, color: "#94a3b8", fontSize: 11, textTransform: "uppercase" }}>ETA</span>
                      {queueState.queue.map((entry) => {
                        const isActive = entry.status === "consultation-started";
                        const statusColor = isActive ? "#6d28d9" : entry.status === "arrived" ? "#0e7490" : "#d97706";
                        const statusBg   = isActive ? "#ede9fe"  : entry.status === "arrived" ? "#ecfeff"  : "#fffbeb";
                        return (
                          <React.Fragment key={entry.appointmentId}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: isActive ? "#ede9fe" : "#f1f5f9", border: `2px solid ${isActive ? "#a78bfa" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: isActive ? "#6d28d9" : "#334155" }}>
                              #{entry.tokenNumber ?? "–"}
                            </div>
                            <span style={{ fontWeight: 600, color: "#1e3a5f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.patientName}
                              {entry.isNext && <span style={{ marginLeft: 6, fontSize: 10, background: "#dcfce7", color: "#16a34a", borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>NEXT</span>}
                            </span>
                            <span style={{ background: statusBg, color: statusColor, borderRadius: 999, padding: "3px 10px", fontWeight: 600, fontSize: 11, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                              {isActive ? "In Consultation" : entry.status}
                            </span>
                            <span style={{ color: "#4338ca", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
                              {isActive ? `${queueState.nowServing?.elapsedMin ?? 0}m elapsed` : entry.etaMinutes === 0 ? "Any moment" : `~${entry.etaMinutes}m`}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
              {[
                { key: "pending", label: "Pending", value: bookingStats.pending, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                { key: "approved", label: "Approved", value: bookingStats.approved, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
                { key: "completed", label: "Completed", value: bookingStats.completed, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
                { key: "cancelled", label: "Cancelled", value: bookingStats.cancelled, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                { key: "rejected", label: "Rejected", value: bookingStats.rejected, color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
              ].map((item) => {
                const active = statusFilter === item.key;
                return (
                  <button
                    type="button"
                    onClick={() => setStatusFilter(item.key)}
                    key={item.key}
                    style={{
                      background: active ? item.bg : "#fff",
                      borderRadius: 14,
                      padding: "14px 12px",
                      border: active ? `2px solid ${item.color}` : `1px solid ${item.border}`,
                      boxShadow: active
                        ? "0 8px 20px rgba(37,99,235,0.16)"
                        : "0 2px 10px rgba(37,99,235,0.06)",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: active ? item.color : "#64748b", fontWeight: active ? 700 : 600 }}>
                      {item.label}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && bookings.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
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
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {filter.label} ({filter.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Skeleton loading */}
          {loading && (
            <div>
              {[0, 1].map((d) => (
                <section key={d} style={{ marginBottom: 28 }}>
                  <div className="skeleton" style={{ width: 180, height: 14, marginBottom: 14 }} />
                  <div className="appt-grid">
                    <SkeletonCard /><SkeletonCard />
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && bookings.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><Activity size={24} color="var(--azure)" /></div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: "var(--slate)", margin: "0 0 6px" }}>No appointments yet</p>
              <p style={{ color: "var(--mist)", fontSize: 15, margin: 0 }}>New patient bookings will appear here automatically.</p>
            </div>
          )}

          {!loading && bookings.length > 0 && filteredBookings.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><AlertTriangle size={24} color="var(--azure)" /></div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: "var(--slate)", margin: "0 0 6px" }}>
                No {statusFilter} appointments found
              </p>
              <p style={{ color: "var(--mist)", fontSize: 15, margin: 0 }}>Filter change karke dusri appointment details dekh sakte ho.</p>
            </div>
          )}

          {/* Appointment list */}
          {!loading && filteredBookings.length > 0 && sortedDateKeys.map((dateKey) => (
            <section key={dateKey} style={{ marginBottom: 28 }}>
              <div className="date-header">
                <Calendar size={15} />
                {formatDateLabel(dateKey)}
                <span style={{ background: "var(--azure-pale)", color: "var(--azure)", borderRadius: 999, padding: "1px 8px", fontSize: 12 }}>
                  {grouped[dateKey].length} appt{grouped[dateKey].length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="appt-grid">
                {grouped[dateKey].map((item) => (
                  <div key={item._id} className="appt-card">
                    {/* Card top */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        {/* 🎟️ Token badge — only shown on today's appointments */}
                        {item.tokenNumber && item.date === new Date().toISOString().slice(0, 10) ? (
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#ede9fe,#dbeafe)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid #c4b5fd" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#6d28d9", lineHeight: 1 }}>#{item.tokenNumber}</span>
                            <span style={{ fontSize: 8, color: "#8b5cf6", fontWeight: 600, letterSpacing: "0.04em" }}>TOKEN</span>
                          </div>
                        ) : (
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--azure-pale)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <User size={18} color="var(--azure)" />
                          </div>
                        )}
                        <div>
                          <p style={{ fontWeight: 600, color: "var(--slate)", fontSize: 17, margin: 0 }}>{item.patient?.name}</p>
                          <p style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--mist)", fontSize: 13.5, margin: "3px 0 0" }}>
                            <Mail size={11} />{item.patient?.email}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={item.status} />
                    </div>

                    {/* Time + clinical button */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--mist)", fontSize: 14.5 }}>
                          <Clock3 size={13} />{item.time}
                        </span>
                        {item.status === "consultation-started" && (
                          <LiveConsultationTimer startTime={item.consultationStartTime} />
                        )}
                      </div>
                      <button className="btn-clinical" onClick={() => openClinical(item)}>
                        <ClipboardList size={12} /> Clinical Notes
                      </button>
                    </div>

                    {/* Review badge */}
                    {item.review && (
                      <div className="review-badge">
                        <Star size={12} fill="#f59e0b" color="#f59e0b" />
                        {item.review.rating}/5
                        {item.review.comment && <span style={{ color: "#78350f" }}>· {item.review.comment}</span>}
                      </div>
                    )}

                    {/* Timeline */}
                    <Timeline status={item.status} />

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                      <button className="btn btn-ghost" onClick={() => openMessage(item)}>
                        <MessageSquare size={14} /> Message
                      </button>
                      {item.status === "pending" && (
                        <>
                          <button className="btn btn-primary" onClick={() => askAction(item._id, "Approve", `/appointments/${item._id}`)} disabled={actionLoading.id === item._id}>
                            {actionLoading.id === item._id && actionLoading.type === "Approve" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={14} />}
                            Approve
                          </button>
                          <button className="btn btn-danger" onClick={() => askAction(item._id, "Reject", `/appointments/${item._id}`)} disabled={actionLoading.id === item._id}>
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}
                      {["pending", "approved", "rescheduled"].includes(item.status) && (
                        <button className="btn btn-ghost" onClick={() => openReschedule(item)}>
                          <Calendar size={14} /> Reschedule
                        </button>
                      )}
                      {item.status === "approved" && (
                        <button
                          className="btn btn-primary"
                          onClick={() => askAction(item._id, "Mark Arrived", `/appointments/${item._id}`)}
                          disabled={actionLoading.id === item._id}
                        >
                          {actionLoading.id === item._id && actionLoading.type === "Mark Arrived" ? (
                            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Mark Arrived
                        </button>
                      )}
                      {item.status === "arrived" && (
                        <button className="btn btn-indigo" onClick={() => askAction(item._id, "Start Consultation", `/appointments/${item._id}/start-consultation`)} disabled={actionLoading.id === item._id}>
                          <Stethoscope size={14} /> Start Consultation
                        </button>
                      )}
                      {item.status === "consultation-started" && (
                        <button className="btn btn-success" onClick={() => askAction(item._id, "Complete Consultation", `/appointments/${item._id}/complete-consultation`)} disabled={actionLoading.id === item._id}>
                          <CheckCircle2 size={14} /> Complete Consultation
                        </button>
                      )}
                      {canCancel(item.status) && (
                        <button className="btn btn-danger" onClick={() => openCancel(item)} disabled={actionLoading.id === item._id}>
                          <XCircle size={14} /> Cancel
                        </button>
                      )}
                      {["consultation-completed", "completed"].includes(item.status) && (
                        <>
                          <span className="completed-badge"><CheckCircle2 size={15} /> Completed</span>
                          <button className="btn btn-ghost" onClick={() => downloadPrescription(item._id)}>
                            <Download size={14} /> Prescription PDF
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* ── Clinical Modal ── */}
        {selected && (
          <div className="modal-overlay">
            <div className="modal">
              {/* Header */}
              <div className="modal-header">
                <h2><Stethoscope size={20} /> Clinical Documentation</h2>
                <button className="modal-close" onClick={() => setSelected(null)}>
                  <XCircle size={18} />
                </button>
              </div>

              {/* Patient info strip */}
              <div style={{ padding: "14px 24px", background: "var(--azure-pale)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--azure)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={17} color="#fff" />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--slate)", fontSize: 16, margin: 0 }}>{selected.patient?.name}</p>
                  <p style={{ color: "var(--mist)", fontSize: 13.5, margin: 0 }}>{selected.patient?.email} · {selected.time}</p>
                </div>
                {selected.patient?.medicalHistory?.allergies && (
                  <div style={{
                    marginLeft: "8px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase" }}>Allergies:</span>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#dc2626" }}>⚠️ {selected.patient.medicalHistory.allergies}</span>
                  </div>
                )}
                <div style={{ marginLeft: "auto" }}><StatusPill status={selected.status} /></div>
              </div>

              {/* ❤️ Pre-Consult AI Vitals Brief Card */}
              {(loadingBrief || preConsultBrief) && (
                <div
                  style={{
                    margin: "14px 24px 0",
                    background: "linear-gradient(135deg, #f0fdfa 0%, #ecfeff 50%, #eff6ff 100%)",
                    border: "1.5px solid #a5f3fc",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    boxShadow: "0 2px 10px rgba(6, 182, 212, 0.08)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #0284c7, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)" }}>
                        <Activity size={16} />
                      </div>
                      <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#0e7490", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Pre-Consult AI Vitals Brief
                      </span>
                    </div>

                    {preConsultBrief?.trendData?.metrics && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: preConsultBrief.trendData.metrics.trendDirection === "upward" ? "#fee2e2" : preConsultBrief.trendData.metrics.trendDirection === "downward" ? "#ecfdf5" : "#f1f5f9",
                          color: preConsultBrief.trendData.metrics.trendDirection === "upward" ? "#dc2626" : preConsultBrief.trendData.metrics.trendDirection === "downward" ? "#059669" : "#475569",
                          border: "1px solid currentColor"
                        }}>
                          {preConsultBrief.trendData.metrics.trendDirection === "upward" ? "↑ " : preConsultBrief.trendData.metrics.trendDirection === "downward" ? "↓ " : "• "}
                          {preConsultBrief.trendData.metrics.systolicTrendPercent > 0 ? `+${preConsultBrief.trendData.metrics.systolicTrendPercent}%` : `${preConsultBrief.trendData.metrics.systolicTrendPercent}%`} (30-Day Trend)
                        </span>

                        {patientVitalsHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowVitalsChart(!showVitalsChart)}
                            style={{
                              background: "#fff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#0369a1",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            {showVitalsChart ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {showVitalsChart ? "Hide Chart" : "View Trend Chart"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {loadingBrief ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#0284c7", padding: "4px 0" }}>
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing patient 30-day vitals & generating AI brief...
                    </div>
                  ) : (
                    <>
                      <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "600", color: "#164e63", lineHeight: "1.45" }}>
                        {preConsultBrief?.aiBrief || "No vitals recorded by this patient yet."}
                      </p>

                      {preConsultBrief?.trendData?.metrics && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                          <span style={{ fontSize: "11.5px", background: "#fff", border: "1px solid #bae6fd", padding: "3px 9px", borderRadius: "6px", color: "#0369a1", fontWeight: "700" }}>
                            30-Day Avg BP: {preConsultBrief.trendData.metrics.avgSystolic}/{preConsultBrief.trendData.metrics.avgDiastolic} mmHg
                          </span>
                          {preConsultBrief.trendData.metrics.avgSugar && (
                            <span style={{ fontSize: "11.5px", background: "#fff", border: "1px solid #bbf7d0", padding: "3px 9px", borderRadius: "6px", color: "#15803d", fontWeight: "700" }}>
                              Avg Sugar: {preConsultBrief.trendData.metrics.avgSugar} mg/dL
                            </span>
                          )}
                          {preConsultBrief.trendData.metrics.latest && (
                            <span style={{ fontSize: "11.5px", background: "#fff", border: "1px solid #e2e8f0", padding: "3px 9px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                              Latest Log: {preConsultBrief.trendData.metrics.latest.systolic}/{preConsultBrief.trendData.metrics.latest.diastolic} mmHg ({new Date(preConsultBrief.trendData.metrics.latest.recordedAt).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expandable Chart for Doctor */}
                      {showVitalsChart && patientVitalsHistory.length > 0 && (
                        <div style={{ marginTop: "12px", background: "#fff", borderRadius: "10px", padding: "10px", border: "1px solid #cbd5e1" }}>
                          <div style={{ width: "100%", height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={patientVitalsHistory.map((v) => {
                                  const d = new Date(v.recordedAt);
                                  return {
                                    date: `${d.getMonth() + 1}/${d.getDate()}`,
                                    systolic: v.systolic,
                                    diastolic: v.diastolic,
                                    bloodSugar: v.bloodSugar || null
                                  };
                                })}
                                margin={{ top: 5, right: 15, left: -25, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} domain={["dataMin - 10", "dataMax + 10"]} tickLine={false} />
                                <RechartsTooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                                <Line type="monotone" dataKey="systolic" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} name="Systolic BP" />
                                <Line type="monotone" dataKey="diastolic" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} name="Diastolic BP" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tab bar */}
              <div style={{ padding: "16px 24px 0" }}>
                <div className="tab-bar">
                  <button className={`tab-btn ${activeTab === "prescription" ? "active" : "inactive"}`} onClick={() => setActiveTab("prescription")}>
                    <Pill size={14} /> Prescription
                  </button>
                  <button className={`tab-btn ${activeTab === "notes" ? "active" : "inactive"}`} onClick={() => setActiveTab("notes")}>
                    <MessageSquare size={14} /> Private Notes
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="modal-body">

                {/* Prescription tab */}
                {activeTab === "prescription" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* 🎙️ AI Voice Scribe */}
                    <VoiceScribeWidget
                      onApplyPrescription={(extracted) => {
                        setPrescription((prev) => ({
                          ...prev,
                          diagnosis: extracted.diagnosis || prev.diagnosis,
                          medicines: extracted.medicines && extracted.medicines.length > 0
                            ? extracted.medicines
                            : prev.medicines,
                          advice: extracted.advice || prev.advice,
                          followUpDate: extracted.followUpDate || prev.followUpDate,
                        }));
                        dispatch(showToast({ message: "✨ Prescription auto-filled from voice notes!", type: "success" }));
                      }}
                    />

                    <Field label="Diagnosis">
                      <textarea className="field" rows={3} placeholder="Describe the diagnosis (min 10 characters)…" value={prescription.diagnosis} onChange={(e) => setPrescription((prev) => ({ ...prev, diagnosis: e.target.value }))} />
                    </Field>

                    <div>
                      <div className="section-head"><Pill size={16} /> Medicines</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {prescription.medicines.map((med, index) => (
                          <div key={index} className="med-card">
                            {prescription.medicines.length > 1 && (
                              <button onClick={() => removeMedicine(index)} style={{ position: "absolute", top: 10, right: 10, background: "#fee2e2", border: "none", borderRadius: 7, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--danger)", fontFamily: "'DM Sans', sans-serif" }}>
                                <Trash2 size={11} /> Remove
                              </button>
                            )}
                            <Field label="Medicine name" style={{ marginBottom: 10 }}>
                              <input className="field" placeholder="e.g. Amoxicillin" value={med.name} onChange={(e) => updateMedicine(index, "name", e.target.value)} />
                            </Field>
                            <div className="modal-grid" style={{ gap: 10, marginBottom: 10 }}>
                              <Field label="Dosage">
                                <input className="field" placeholder="e.g. 500mg" value={med.dosage} onChange={(e) => updateMedicine(index, "dosage", e.target.value)} />
                              </Field>
                              <Field label="Frequency">
                                <input className="field" placeholder="e.g. Twice daily" value={med.frequency} onChange={(e) => updateMedicine(index, "frequency", e.target.value)} />
                              </Field>
                            </div>
                            <div className="modal-grid" style={{ gap: 10 }}>
                              <Field label="Duration">
                                <input className="field" placeholder="e.g. 7 days" value={med.duration} onChange={(e) => updateMedicine(index, "duration", e.target.value)} />
                              </Field>
                              <Field label="Instructions (optional)">
                                <input className="field" placeholder="e.g. After meals" value={med.instructions} onChange={(e) => updateMedicine(index, "instructions", e.target.value)} />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 13 }} onClick={addMedicine}>
                        <Plus size={14} /> Add medicine
                      </button>
                    </div>

                    <div className="modal-grid">
                      <Field label="General advice (optional)">
                        <textarea className="field" rows={3} placeholder="Lifestyle advice, diet, precautions…" value={prescription.advice} onChange={(e) => setPrescription((prev) => ({ ...prev, advice: e.target.value }))} />
                      </Field>
                      <Field label="Follow-up date">
                        <input type="date" className="field" value={prescription.followUpDate} onChange={(e) => setPrescription((prev) => ({ ...prev, followUpDate: e.target.value }))} />
                      </Field>
                    </div>

                    {/* Version & Past History */}
                    {prescription.versionHistory && prescription.versionHistory.length > 0 && (
                      <div style={{ background: "#f8faff", borderRadius: 12, padding: 14, border: "1px solid var(--line)", marginTop: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--slate)", display: "flex", alignItems: "center", gap: 6 }}>
                            <History size={15} color="var(--azure)" /> Revision History (Current: v{prescription.version || 1})
                          </span>
                          <span style={{ fontSize: 12, color: "var(--mist)", fontWeight: 500 }}>
                            {prescription.versionHistory.length} previous edit{prescription.versionHistory.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                          {prescription.versionHistory.map((vh, vIdx) => (
                            <div key={vIdx} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0", fontSize: 12.5 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--mist)", marginBottom: 4 }}>
                                <strong style={{ color: "var(--azure)" }}>Version {vh.version}</strong>
                                <span>{vh.editedAt ? new Date(vh.editedAt).toLocaleString() : ""}</span>
                              </div>
                              <div style={{ color: "var(--slate)", marginBottom: 3 }}>
                                <strong>Diagnosis:</strong> {vh.diagnosis}
                              </div>
                              {vh.medicines && vh.medicines.length > 0 && (
                                <div style={{ color: "#475569" }}>
                                  <strong>Meds:</strong> {vh.medicines.map(m => `${m.name} (${m.dosage})`).join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes tab */}
                {activeTab === "notes" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#92400e", display: "flex", alignItems: "center", gap: 7 }}>
                      <AlertTriangle size={13} /> These notes are private and visible only to you.
                    </div>
                    <div className="modal-grid">
                      <Field label="Symptoms observed">
                        <textarea className="field" rows={4} placeholder="List observed symptoms…" value={doctorNotes.symptomsObserved} onChange={(e) => setDoctorNotes((prev) => ({ ...prev, symptomsObserved: e.target.value }))} />
                      </Field>
                      <Field label="Clinical observations">
                        <textarea className="field" rows={4} placeholder="Physical examination findings…" value={doctorNotes.clinicalObservations} onChange={(e) => setDoctorNotes((prev) => ({ ...prev, clinicalObservations: e.target.value }))} />
                      </Field>
                      <Field label="Suggested tests">
                        <textarea className="field" rows={4} placeholder="Lab tests, imaging, etc…" value={doctorNotes.suggestedTests} onChange={(e) => setDoctorNotes((prev) => ({ ...prev, suggestedTests: e.target.value }))} />
                      </Field>
                      <Field label="Internal remarks">
                        <textarea className="field" rows={4} placeholder="Personal remarks, flags…" value={doctorNotes.internalRemarks} onChange={(e) => setDoctorNotes((prev) => ({ ...prev, internalRemarks: e.target.value }))} />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
                <button className="btn btn-primary" disabled={saving} onClick={saveClinicalData}>
                  {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <FileText size={14} />}
                  Save Clinical Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Message Modal ── */}
        {messageModal.open && messageModal.appointment && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 720 }}>
              <div className="modal-header">
                <h2><MessageSquare size={20} /> Message Patient</h2>
                <button className="modal-close" onClick={() => setMessageModal({ open: false, appointment: null, subject: "", body: "" })}>
                  <XCircle size={18} />
                </button>
              </div>

              <div style={{ padding: "14px 24px", background: "var(--azure-pale)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--azure)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={17} color="#fff" />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--slate)", fontSize: 16, margin: 0 }}>{messageModal.appointment.patient?.name}</p>
                  <p style={{ color: "var(--mist)", fontSize: 13.5, margin: 0 }}>{messageModal.appointment.patient?.email}</p>
                </div>
              </div>

              <div className="modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Subject">
                    <input
                      className="field"
                      value={messageModal.subject}
                      onChange={(e) => setMessageModal((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Appointment update"
                    />
                  </Field>
                  <Field label="Message">
                    <textarea
                      className="field"
                      rows={5}
                      value={messageModal.body}
                      onChange={(e) => setMessageModal((prev) => ({ ...prev, body: e.target.value }))}
                      placeholder="Write a short message for the patient…"
                    />
                  </Field>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setMessageModal({ open: false, appointment: null, subject: "", body: "" })}>Cancel</button>
                <button className="btn btn-primary" disabled={messageSending} onClick={sendMessage}>
                  {messageSending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <MessageSquare size={14} />}
                  Send Message
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelDialog.open && cancelDialog.appointment && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 560 }}>
              <div className="modal-header">
                <h2><XCircle size={20} /> Cancel Appointment</h2>
                <button className="modal-close" onClick={() => setCancelDialog({ open: false, appointment: null, reason: "" })}>
                  <XCircle size={18} />
                </button>
              </div>

              <div style={{ padding: "14px 24px", background: "var(--azure-pale)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--azure)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={17} color="#fff" />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--slate)", fontSize: 16, margin: 0 }}>{cancelDialog.appointment.patient?.name}</p>
                  <p style={{ color: "var(--mist)", fontSize: 13.5, margin: 0 }}>{cancelDialog.appointment.patient?.email}</p>
                </div>
              </div>

              <div className="modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Reason (sent to patient email)">
                    <textarea
                      className="field"
                      rows={4}
                      value={cancelDialog.reason}
                      onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Write a short reason (optional)"
                    />
                  </Field>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setCancelDialog({ open: false, appointment: null, reason: "" })}>Back</button>
                <button className="btn btn-danger" disabled={actionLoading.id === cancelDialog.appointment._id} onClick={submitCancel}>
                  {actionLoading.id === cancelDialog.appointment._id && actionLoading.type === "Cancel" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <XCircle size={14} />}
                  Cancel Appointment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Doctor Reschedule Modal ── */}
        {rescheduleModal.open && rescheduleModal.appointment && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h2><Calendar size={20} /> Reschedule Appointment</h2>
                <button className="modal-close" onClick={() => setRescheduleModal({ open: false, appointment: null, date: "", slotId: "", slots: [], loadingSlots: false, submitting: false })}>
                  <XCircle size={18} />
                </button>
              </div>

              <div style={{ padding: "14px 24px", background: "var(--azure-pale)", borderBottom: "1px solid var(--line)" }}>
                <p style={{ margin: 0, fontWeight: 600, color: "var(--slate)", fontSize: 15 }}>
                  Patient: {rescheduleModal.appointment.patient?.name}
                </p>
                <p style={{ margin: "3px 0 0", color: "var(--mist)", fontSize: 13 }}>
                  Current schedule: {rescheduleModal.appointment.date} at {rescheduleModal.appointment.time}
                </p>
              </div>

              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--slate)", marginBottom: 6, textTransform: "uppercase" }}>
                    Select New Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    className="field"
                    value={rescheduleModal.date}
                    onChange={(e) => handleDoctorRescheduleDateChange(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--slate)", marginBottom: 8, textTransform: "uppercase" }}>
                    Available Time Slots
                  </label>
                  {rescheduleModal.loadingSlots ? (
                    <div style={{ padding: 18, textAlign: "center", color: "var(--azure)" }}>
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }} />
                      Loading slots...
                    </div>
                  ) : rescheduleModal.slots.length === 0 ? (
                    <div style={{ padding: 14, textAlign: "center", background: "#f8fafc", borderRadius: 10, border: "1px dashed var(--line)", color: "var(--mist)", fontSize: 13 }}>
                      No available slots found for this date.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: 8, maxHeight: 150, overflowY: "auto" }}>
                      {rescheduleModal.slots.map((s) => {
                        const isSel = rescheduleModal.slotId === s._id;
                        return (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => setRescheduleModal((p) => ({ ...p, slotId: s._id }))}
                            style={{
                              padding: "8px 10px", borderRadius: 8,
                              border: isSel ? "2px solid var(--azure)" : "1px solid var(--line)",
                              background: isSel ? "var(--azure-pale)" : "#fff",
                              color: isSel ? "var(--azure-deep)" : "var(--slate)",
                              fontWeight: isSel ? 700 : 500, fontSize: 13,
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                            }}
                          >
                            <Clock size={12} /> {s.startTime}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setRescheduleModal({ open: false, appointment: null, date: "", slotId: "", slots: [], loadingSlots: false, submitting: false })}>
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={rescheduleModal.submitting || !rescheduleModal.slotId} onClick={handleDoctorConfirmReschedule}>
                  {rescheduleModal.submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Calendar size={14} />}
                  Confirm Reschedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🛡️ Prescription Safety Conflict Alert Modal */}
        {safetyConflictModal.isOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(6px)",
              zIndex: 1200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
          >
            <div
              style={{
                maxWidth: "540px",
                width: "100%",
                background: "#ffffff",
                borderRadius: "20px",
                boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.15)",
                overflow: "hidden"
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                  borderBottom: "1px solid #fecaca",
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px"
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "#fee2e2",
                    border: "1.5px solid #f87171",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#dc2626",
                    flexShrink: 0
                  }}
                >
                  <ShieldAlert size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: "800", color: "#991b1b" }}>
                    Prescription Safety Alert
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#b91c1c" }}>
                    Potential allergy conflict detected for {safetyConflictModal.patientName}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "20px 22px" }}>
                {/* Documented Allergies Tag */}
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Documented Allergies:
                  </span>
                  <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#dc2626", background: "#fff", padding: "3px 10px", borderRadius: "999px", border: "1px solid #fca5a5" }}>
                    ⚠️ {safetyConflictModal.patientAllergies}
                  </span>
                </div>

                {/* List of Conflicts */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "240px", overflowY: "auto" }}>
                  {safetyConflictModal.conflicts.map((conf, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#fff",
                        border: "1.5px solid #fca5a5",
                        borderLeft: "5px solid #dc2626",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        boxShadow: "0 2px 6px rgba(220, 38, 38, 0.06)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "800", color: "#991b1b" }}>
                          {conf.medicineName}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: "800", background: "#dc2626", color: "#fff", padding: "2px 7px", borderRadius: "6px", textTransform: "uppercase" }}>
                          {conf.severity || "HIGH"} CONFLICT
                        </span>
                      </div>
                      <p style={{ margin: "0 0 6px", fontSize: "12.5px", color: "#7f1d1d", fontWeight: "600", lineHeight: "1.4" }}>
                        {conf.reason}
                      </p>
                      {conf.recommendation && (
                        <p style={{ margin: 0, fontSize: "11.5px", color: "#047857", background: "#ecfdf5", padding: "6px 8px", borderRadius: "6px", border: "1px solid #a7f3d0", fontWeight: "500" }}>
                          💡 <strong>Safe Alternative:</strong> {conf.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Optional Override Clinical Reason Input */}
                <div style={{ marginTop: "14px" }}>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                    Clinical Justification (optional for override):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Desensitization done, Patient previously tolerated, or Alternative verified"
                    value={safetyConflictModal.overrideReason}
                    onChange={(e) => setSafetyConflictModal((prev) => ({ ...prev, overrideReason: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div
                style={{
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  padding: "14px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px"
                }}
              >
                <button
                  type="button"
                  onClick={() => setSafetyConflictModal({ isOpen: false, conflicts: [], patientAllergies: "", patientName: "", overrideReason: "" })}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "10px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  ← Revise Prescription
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveClinicalData({ overrideSafetyCheck: true, overrideReason: safetyConflictModal.overrideReason })}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "10px",
                    background: saving ? "#f87171" : "linear-gradient(135deg, #dc2626, #b91c1c)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: "800",
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  Override & Save Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm dialog (unchanged) */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.action || "Confirm"}
          message={`Are you sure you want to ${String(confirmDialog.action || "").toLowerCase()}?`}
          confirmText={confirmDialog.action || "Confirm"}
          backdropClassName="bg-blue-900/20 backdrop-blur-sm"
          isDangerous={["Reject"].includes(confirmDialog.action)}
          onConfirm={async () => {
            if (!confirmDialog.endpoint) return;
            if (confirmDialog.endpoint.endsWith("/appointments/" + confirmDialog.appointmentId)) {
              const statusMap = { Approve: "approved", Reject: "rejected", "Mark Arrived": "arrived" };
              try {
                setActionLoading({ id: confirmDialog.appointmentId, type: confirmDialog.action });
                await API.put(`/appointments/${confirmDialog.appointmentId}`, { status: statusMap[confirmDialog.action] });
                await fetchBookings();
                dispatch(showToast({ message: `${confirmDialog.action} successful`, type: "success" }));
              } catch (error) {
                dispatch(showToast({ message: error.response?.data?.message || "Action failed", type: "error" }));
              } finally {
                setActionLoading({ id: null, type: null });
                setConfirmDialog({ isOpen: false, appointmentId: null, action: null, endpoint: null });
              }
              return;
            }
            executeAction();
          }}
          onCancel={() => setConfirmDialog({ isOpen: false, appointmentId: null, action: null, endpoint: null })}
        />
      </div>
    </>
  );
}