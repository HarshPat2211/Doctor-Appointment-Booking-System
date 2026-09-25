// src/pages/DoctorDashboard.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../util/api";
import { getSocket } from "../../utils/socket";
import {
  IndianRupee, Users, Calendar, Star,
  TrendingUp, Clock, BarChart2, MessageSquare,
  Settings, ArrowRight, Loader2,
} from "lucide-react";

/* ─────────────────────────────────────────
   Lazy-reveal hook + wrapper
───────────────────────────────────────── */
function useLazyReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useLazyReveal();
  return (
    <div ref={ref} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ${delay}ms ease, transform 0.6s ${delay}ms ease`,
    }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   Status badge helper
───────────────────────────────────────── */
const statusStyle = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "confirmed" || s === "approved") return { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" };
  if (s === "arrived") return { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" };
  if (s === "consultation-started") return { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" };
  if (s === "pending") return { color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  if (s === "completed" || s === "consultation-completed") return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
  if (s === "cancelled") return { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
  return { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
};

const bookingTimestamp = (booking = {}) => {
  const datePart = String(booking?.date || "").trim();
  const timePart = String(booking?.time || "").trim();

  if (datePart && timePart) {
    const combined = new Date(`${datePart} ${timePart}`);
    if (!Number.isNaN(combined.getTime())) return combined.getTime();
  }

  if (datePart) {
    const dateOnly = new Date(datePart);
    if (!Number.isNaN(dateOnly.getTime())) return dateOnly.getTime();
  }

  return 0;
};

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    appointmentsCount: 0,
    activePatients: 0,
    recentBookings: [],
    averageRating: "0.0",
    appointmentSuccessRate: 0,
    avgResponseTime: 24,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const { data } = await API.get("/doctors/dashboard");
      setDashboard({
        totalEarnings: data?.totalEarnings ?? 0,
        thisMonthEarnings: data?.thisMonthEarnings ?? 0,
        appointmentsCount: data?.appointmentsCount ?? 0,
        activePatients: data?.activePatients ?? 0,
        recentBookings: data?.recentBookings ?? [],
        averageRating: data?.averageRating ?? "0.0",
        appointmentSuccessRate: data?.appointmentSuccessRate ?? 0,
        avgResponseTime: data?.avgResponseTime ?? 24,
      });
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(true);

    const socket = getSocket();
    const handleStatusUpdate = () => fetchDashboard(false);
    socket.on("appointmentStatusUpdate", handleStatusUpdate);

    const intervalId = setInterval(() => {
      fetchDashboard(false);
    }, 30000);

    const handleFocus = () => fetchDashboard(false);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchDashboard(false);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      socket.off("appointmentStatusUpdate", handleStatusUpdate);
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchDashboard]);

  if (loading) return (
    <div style={{
      minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: "3px solid #dbeafe", borderTopColor: "#2563eb", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#2563eb", fontSize: "14px", fontWeight: "500" }}>Loading dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const statCards = [
    { label: "Total Earnings", value: `₹${dashboard.totalEarnings}`, icon: <IndianRupee size={18} />, trend: "+12% from last month", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "This Month", value: `₹${dashboard.thisMonthEarnings}`, icon: <TrendingUp size={18} />, trend: "+18% from last month", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
    { label: "Active Patients", value: dashboard.activePatients, icon: <Users size={18} />, trend: "+3 from last week", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
    { label: "Total Appointments", value: dashboard.appointmentsCount, icon: <Calendar size={18} />, trend: "+5 from last month", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  ];

  const quickActions = [
    { icon: <BarChart2 size={15} />, label: "View Analytics", onClick: () => navigate("/doctor/bookings") },
    { icon: <MessageSquare size={15} />, label: "Messages", onClick: () => navigate("/doctor/bookings") },
    { icon: <Settings size={15} />, label: "Settings", onClick: () => navigate("/doctor/settings") },
  ];

  const completedStatuses = ["completed", "consultation-completed"];
  const hiddenStatuses = ["completed", "consultation-completed", "cancelled", "rejected", "no-show"];
  const nextBooking = (dashboard.recentBookings || []).find(
    (booking) => !hiddenStatuses.includes((booking?.status || "").toLowerCase())
  );
  const firstBooking = dashboard.recentBookings?.[0];
  const showCompleteState = firstBooking && completedStatuses.includes((firstBooking.status || "").toLowerCase());

  return (
    <div style={{
      padding: "28px",
      background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 55%, #e8f4ff 100%)",
      minHeight: "100vh",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      display: "flex", flexDirection: "column", gap: "24px",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── HERO ── */}
      <Reveal delay={0}>
        <div style={{
          borderRadius: "18px",
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #38bdf8 100%)",
          padding: "28px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "24px", flexWrap: "wrap",
          boxShadow: "0 8px 32px rgba(37,99,235,0.25)",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#fff" }}>
              Doctor Dashboard 🩺
            </h1>
            <p style={{ margin: "6px 0 20px", fontSize: "14px", color: "rgba(255,255,255,0.75)" }}>
              Track your earnings, bookings, and patient feedback.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <button
                onClick={() => navigate("/doctor/profile")}
                style={{
                  padding: "10px 20px", borderRadius: "10px",
                  background: "#fff", color: "#2563eb",
                  fontWeight: "700", fontSize: "14px", border: "none",
                  cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  display: "flex", alignItems: "center", gap: "6px",
                  fontFamily: "inherit", transition: "transform 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
              >
                Edit Profile <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate("/doctor/calendar")}
                style={{
                  padding: "10px 20px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.15)", color: "#fff",
                  fontWeight: "600", fontSize: "14px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  cursor: "pointer", fontFamily: "inherit",
                  backdropFilter: "blur(4px)", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              >
                Update Availability
              </button>
            </div>
          </div>

          {/* Next booking mini card */}
          <div style={{
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
            borderRadius: "14px", padding: "18px 22px",
            border: "1px solid rgba(255,255,255,0.25)", minWidth: "180px",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Next Booking
            </p>
            {nextBooking ? (
              <>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#fff" }}>
                  {nextBooking.patient}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                  {nextBooking.date ? new Date(nextBooking.date).toDateString() : ""}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                  {nextBooking.time ? `Time: ${nextBooking.time}` : ""}
                </p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
                  {nextBooking.status || "pending"}
                </span>
              </>
            ) : showCompleteState ? (
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: "600" }}>
                Complete
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>No upcoming bookings</p>
            )}
          </div>
        </div>
      </Reveal>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "16px" }}>
        {statCards.map((s, i) => (
          <Reveal key={i} delay={i * 80}>
            <div style={{
              background: "#fff", borderRadius: "14px",
              padding: "20px", border: `1px solid ${s.border}`,
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
              display: "flex", alignItems: "center", gap: "14px",
            }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: s.bg, border: `1px solid ${s.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: s.color, flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                <p style={{ margin: "4px 0 2px", fontSize: "22px", fontWeight: "800", color: "#1e3a5f" }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#059669", fontWeight: "500" }}>{s.trend}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* ── MAIN COLUMNS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>

        {/* Recent Bookings */}
        <Reveal delay={0}>
          <div style={{
            background: "#fff", borderRadius: "16px",
            padding: "22px", border: "1px solid #dbeafe",
            boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={16} style={{ color: "#2563eb" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>Recent Bookings</h3>
              </div>
              <button
                onClick={() => navigate("/doctor/bookings")}
                style={{ fontSize: "13px", color: "#2563eb", fontWeight: "600", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>

            {dashboard.recentBookings?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[...(dashboard.recentBookings || [])]
                  .sort((a, b) => bookingTimestamp(b) - bookingTimestamp(a))
                  .map((booking, i) => {
                  const sc = statusStyle(booking.status);
                  return (
                    <Reveal key={i} delay={i * 70}>
                      <div style={{
                        padding: "14px 16px", borderRadius: "12px",
                        border: "1px solid #dbeafe", background: "#fafcff",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: "pointer", transition: "all 0.15s ease",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fafcff"; e.currentTarget.style.borderColor = "#dbeafe"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "38px", height: "38px", borderRadius: "50%",
                            background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: "700", fontSize: "14px", flexShrink: 0,
                          }}>
                            {(booking.patient || "P").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1e3a5f" }}>{booking.patient || "N/A"}</p>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                              {booking.service || "Consultation"} · {booking.date ? new Date(booking.date).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#2563eb" }}>₹{booking.price || 0}</p>
                          <span style={{
                            display: "inline-block", marginTop: "4px",
                            padding: "2px 8px", borderRadius: "20px",
                            fontSize: "11px", fontWeight: "600",
                            color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                          }}>
                            {booking.status || "pending"}
                          </span>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "32px", textAlign: "center" }}>
                <Calendar size={30} style={{ color: "#bfdbfe", margin: "0 auto 10px" }} />
                <p style={{ color: "#94a3b8", fontSize: "13px" }}>No recent bookings</p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Performance */}
          <Reveal delay={100}>
            <div style={{
              background: "#fff", borderRadius: "16px",
              padding: "22px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                <Star size={16} style={{ color: "#2563eb" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>Performance</h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Rating */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#f8faff", borderRadius: "10px", border: "1px solid #dbeafe" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Star size={14} style={{ color: "#f59e0b" }} />
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Rating</span>
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f" }}>{dashboard.averageRating} ⭐</span>
                </div>

                {/* Success Rate */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <TrendingUp size={14} style={{ color: "#2563eb" }} />
                      <span style={{ fontSize: "13px", color: "#64748b" }}>Success Rate</span>
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>{dashboard.appointmentSuccessRate}%</span>
                  </div>
                  <div style={{ height: "8px", background: "#f0f7ff", borderRadius: "10px", overflow: "hidden", border: "1px solid #dbeafe" }}>
                    <div style={{
                      height: "100%",
                      width: `${dashboard.appointmentSuccessRate || 0}%`,
                      background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                      borderRadius: "10px",
                      transition: "width 1s ease",
                    }} />
                  </div>
                </div>

                {/* Avg Response */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#f8faff", borderRadius: "10px", border: "1px solid #dbeafe" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock size={14} style={{ color: "#2563eb" }} />
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Avg Response</span>
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f" }}>{dashboard.avgResponseTime}h</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Quick Actions */}
          <Reveal delay={180}>
            <div style={{
              background: "#fff", borderRadius: "16px",
              padding: "22px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <Settings size={16} style={{ color: "#2563eb" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>Quick Actions</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {quickActions.map((action, i) => (
                  <button key={i} onClick={action.onClick} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "11px 14px", borderRadius: "10px",
                    border: "1px solid #dbeafe", background: "#f8faff",
                    color: "#334155", fontSize: "13px", fontWeight: "500",
                    cursor: "pointer", fontFamily: "inherit",
                    width: "100%", textAlign: "left",
                    transition: "all 0.15s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.color = "#334155"; e.currentTarget.style.borderColor = "#dbeafe"; }}
                  >
                    <span style={{ color: "#60a5fa" }}>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}