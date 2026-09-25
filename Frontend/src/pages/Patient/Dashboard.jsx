// src/pages/Patient/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../util/api";
import { Calendar, Clock, Star, Wallet, Stethoscope, Activity, Bell, Heart, Sparkles, ArrowRight } from "lucide-react";
import VitalsTrackerWidget from "../../Componet/VitalsTrackerWidget";

export default function PatientDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [savedDoctors, setSavedDoctors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [reminders, setReminders] = useState([]);
  const auth = JSON.parse(localStorage.getItem("auth"));
  const user = auth?.user || null;
  const savedKey = user?._id ? `savedDoctors:${user._id}` : "savedDoctors:guest";

  const readSavedDoctors = useCallback(() => {
    try {
      const raw = localStorage.getItem(savedKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [savedKey]);

  const timeAgo = (value) => {
    if (!value) return "";
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return "";
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  };

  const statusLabel = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return "appointment approved";
    if (s === "pending") return "appointment requested";
    if (s === "arrived") return "checked in";
    if (s === "consultation-started" || s === "in-progress") return "consultation started";
    if (s === "consultation-completed") return "consultation completed";
    if (s === "completed") return "appointment completed";
    if (s === "cancelled") return "appointment cancelled";
    if (s === "rejected") return "appointment rejected";
    if (s === "rescheduled") return "appointment rescheduled";
    if (s === "no-show") return "appointment cancelled";
    return "appointment updated";
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await API.get("/appointments/my");
      const remindersRes = await API.get("/appointments/my/reminders");
      const appts = res.data || [];
      const saved = readSavedDoctors();
      const reminderData = Array.isArray(remindersRes.data) ? remindersRes.data : [];
      const fallbackReminders = appts.filter((a) => (a.status || "").toLowerCase() === "approved");
      setReminders(reminderData.length ? reminderData : fallbackReminders);
      setUpcoming(appts.slice(0, 4));
      setSavedDoctors(saved);

      const activeAppointments = appts.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return !["completed", "consultation-completed", "cancelled", "rejected", "no-show"].includes(s);
      }).length;
      const totalSpent = appts
        .filter((a) => {
          const s = (a.status || "").toLowerCase();
          return !["cancelled", "rejected", "no-show"].includes(s);
        })
        .reduce((s, a) => s + (a.fees || a.fee || 0), 0);
      const ratings = appts.map((a) => a.review?.rating).filter((val) => typeof val === "number");
      const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length) : null;

      const recent = [...appts]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 5)
        .map((a) => ({
          doctor: a.doctor?.user?.name || a.doctorName || "Doctor",
          action: statusLabel(a.status),
          timeAgo: timeAgo(a.updatedAt || a.createdAt),
        }));

      setActivity(recent);
      setStats({
        activeAppointments,
        totalSpent,
        savedDoctors: saved.length,
        avgRating: avgRating !== null ? avgRating.toFixed(1) : "—",
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, [readSavedDoctors, statusLabel, timeAgo]);

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, 30000);
    const handleFocus = () => fetchData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData]);

  const statCards = [
    {
      label: "Active Appointments",
      value: stats?.activeAppointments ?? "—",
      icon: <Calendar size={18} />,
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Total Spent",
      value: `₹${stats?.totalSpent ?? "—"}`,
      icon: <Wallet size={18} />,
      color: "#0891b2",
      bg: "#ecfeff",
      border: "#a5f3fc",
    },
    {
      label: "Saved Doctors",
      value: stats?.savedDoctors ?? "—",
      icon: <Heart size={18} />,
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Avg Doctor Rating",
      value: stats?.avgRating ?? "—",
      icon: <Star size={18} />,
      color: "#0891b2",
      bg: "#ecfeff",
      border: "#a5f3fc",
    },
  ];

  const statusColor = (status) => {
    if (!status) return { color: "#64748b", bg: "#f1f5f9" };
    const s = status.toLowerCase();
    if (s === "confirmed") return { color: "#2563eb", bg: "#eff6ff" };
    if (s === "pending") return { color: "#d97706", bg: "#fefce8" };
    if (s === "completed") return { color: "#059669", bg: "#ecfdf5" };
    if (s === "cancelled") return { color: "#dc2626", bg: "#fef2f2" };
    return { color: "#64748b", bg: "#f1f5f9" };
  };

  const getDoctorName = (app) => app?.doctor?.user?.name || app?.doctorName || "Doctor";
  const getDoctorImage = (app) => app?.doctor?.profileImage || app?.doctor?.user?.profileImage || app?.doctorImage || "";
  const getDoctorSpecialty = (app) => app?.doctor?.specialization || app?.specialty || "General";

  return (
    <div
      style={{
        padding: "28px",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 60%, #e8f4ff 100%)",
        minHeight: "100vh",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* ── HERO ── */}
      <div
        style={{
          borderRadius: "18px",
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #38bdf8 100%)",
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          boxShadow: "0 8px 32px rgba(37,99,235,0.25)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#fff" }}>
            Hi, {user?.name || "Patient"} 👋
          </h1>
          <p style={{ margin: "6px 0 20px", fontSize: "14px", color: "rgba(255,255,255,0.75)" }}>
            Welcome back — here's what's happening with your health.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              onClick={() => navigate("/patient/browse-services")}
              style={{
                padding: "10px 20px", borderRadius: "10px",
                background: "#fff", color: "#2563eb",
                fontWeight: "700", fontSize: "14px", border: "none",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              Book a Doctor
            </button>
            {[
              { label: "My Appointments", path: "/patient/appointments" },
              { label: "Edit Profile", path: "/patient/profile" },
            ].map((btn) => (
              <button
                key={btn.path}
                onClick={() => navigate(btn.path)}
                style={{
                  padding: "10px 20px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff", fontWeight: "600", fontSize: "14px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  cursor: "pointer", transition: "background 0.15s",
                  backdropFilter: "blur(4px)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Next appointment mini card */}
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            borderRadius: "14px",
            padding: "18px 22px",
            border: "1px solid rgba(255,255,255,0.25)",
            minWidth: "180px",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Next Appointment
          </p>
          {upcoming[0] ? (
            <>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#fff" }}>
                {getDoctorName(upcoming[0])}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                {upcoming[0].date} · {upcoming[0].time}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
              No upcoming appointments
            </p>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {statCards.map((s, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "20px",
              border: `1px solid ${s.border}`,
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: s.bg, border: `1px solid ${s.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: s.color, flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {s.label}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: "800", color: "#1e3a5f" }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI Symptom Triage Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)",
          borderRadius: "16px",
          padding: "20px 24px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 8px 24px -4px rgba(99, 102, 241, 0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: "800" }}>
                AI Symptom Triage & Doctor Matching
              </h3>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.88)" }}>
              Unsure which doctor you need? Type your symptoms to get instant triage, home advice & matched specialists.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/patient/browse-services")}
          style={{
            background: "#fff",
            color: "#4f46e5",
            border: "none",
            borderRadius: "12px",
            padding: "10px 18px",
            fontSize: "13.5px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            transition: "all 0.15s",
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#f8faff"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
        >
          Try AI Symptom Checker
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ── MAIN COLUMNS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* ❤️ Vitals Tracker Widget */}
          <VitalsTrackerWidget />

          {/* Upcoming Appointments */}
          <div
            style={{
              background: "#fff", borderRadius: "16px",
              padding: "22px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={16} style={{ color: "#2563eb" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                  Upcoming Appointments
                </h3>
              </div>
              <button
                onClick={() => navigate("/patient/appointments")}
                style={{ fontSize: "13px", color: "#2563eb", fontWeight: "600", background: "none", border: "none", cursor: "pointer" }}
              >
                View all →
              </button>
            </div>

            {upcoming.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                <Calendar size={28} style={{ color: "#bfdbfe", margin: "0 auto 8px" }} />
                No upcoming appointments
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcoming.map((app, i) => {
                  const sc = statusColor(app.status);
                  return (
                    <div
                      key={i}
                      onClick={() => navigate("/patient/appointments")}
                      style={{
                        padding: "14px 16px", borderRadius: "12px",
                        border: "1px solid #dbeafe", background: "#fafcff",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: "pointer", transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#eff6ff";
                        e.currentTarget.style.borderColor = "#93c5fd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fafcff";
                        e.currentTarget.style.borderColor = "#dbeafe";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "40px", height: "40px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: "700", fontSize: "15px", flexShrink: 0,
                            overflow: "hidden",
                          }}
                        >
                          {getDoctorImage(app) ? (
                            <img src={getDoctorImage(app)} alt={getDoctorName(app)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            getDoctorName(app).charAt(0)
                          )}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1e3a5f" }}>
                            {getDoctorName(app)}
                          </p>
                          <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                            {getDoctorSpecialty(app)} · {app.date} {app.time}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#2563eb" }}>
                          ₹{app.fees ?? app.fee ?? 0}
                        </p>
                        <span
                          style={{
                            display: "inline-block", marginTop: "4px",
                            padding: "2px 8px", borderRadius: "20px",
                            fontSize: "11px", fontWeight: "600",
                            color: sc.color, background: sc.bg,
                          }}
                        >
                          {app.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div
            style={{
              background: "#fff", borderRadius: "16px",
              padding: "22px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Activity size={16} style={{ color: "#2563eb" }} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                Recent Activity
              </h3>
            </div>
            {activity.length === 0 ? (
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>No recent activity</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                {activity.map((a, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "#64748b" }}>
                    {a.doctor} {a.action} · <span style={{ color: "#94a3b8" }}>{a.timeAgo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reminders */}
          <div
            style={{
              background: "#fff", borderRadius: "16px",
              padding: "22px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Bell size={16} style={{ color: "#2563eb" }} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                Reminders
              </h3>
            </div>
            {reminders.length === 0 ? (
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>No active reminders</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {reminders.slice(0, 4).map((item) => (
                  <div
                    key={item._id}
                    style={{
                      padding: "12px 14px", borderRadius: "10px",
                      background: "#eff6ff", border: "1px solid #bfdbfe",
                      display: "flex", alignItems: "center", gap: "10px",
                    }}
                  >
                    <Clock size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", color: "#1e40af", fontWeight: "500" }}>
                      Dr. {item.doctor?.user?.name || "Doctor"} • {item.date} {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Saved Doctors */}
          <div
            style={{
              background: "#fff", borderRadius: "16px",
              padding: "22px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Stethoscope size={16} style={{ color: "#2563eb" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                  Saved Doctors
                </h3>
              </div>
              <button
                onClick={() => navigate("/patient/browse-services")}
                style={{ fontSize: "13px", color: "#2563eb", fontWeight: "600", background: "none", border: "none", cursor: "pointer" }}
              >
                Browse →
              </button>
            </div>

            {savedDoctors.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                <Stethoscope size={26} style={{ color: "#bfdbfe", margin: "0 auto 8px" }} />
                No saved doctors yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {savedDoctors.map((doc, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1e3a5f" }}>{doc.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{doc.specialty}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/patient/doctor/${doc._id}`, { state: { backTo: "/patient" } })}
                      style={{
                        padding: "6px 14px", borderRadius: "8px",
                        background: "#eff6ff", border: "1px solid #bfdbfe",
                        color: "#2563eb", fontSize: "12px", fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Health Tips */}
          <div
            style={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              padding: "22px",
              border: "1px solid #bfdbfe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Heart size={16} style={{ color: "#2563eb" }} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                Health Tips
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#3b5a8a", lineHeight: "1.6" }}>
              Stay hydrated with at least 8 glasses of water daily, move for 30 minutes, and aim for 7–8 hours of sleep for a healthier you.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}