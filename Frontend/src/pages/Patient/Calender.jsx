import React, { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft, ChevronRight, Clock, Calendar, Globe, Loader2, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "../../Redux/toastSlice";

/* ---------------- TIME UTILITIES ---------------- */
function convert12To24(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)(am|pm)/i);
  if (!match) return timeStr;
  let [_, hour, minute, mer] = match;
  hour = parseInt(hour);
  if (mer.toLowerCase() === "pm" && hour !== 12) hour += 12;
  if (mer.toLowerCase() === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function BookingPage() {
  const dispatch = useDispatch();
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const token = JSON.parse(localStorage.getItem("auth"))?.token;

  const api = useMemo(() => axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const res = await api.get(`/doctors/${id}`);
        setDoctor(res.data);
      } catch (err) {
        console.log("Error loading doctor", err);
      }
    };
    loadDoctor();
  }, [id, api]);

  const handleDateSelect = async (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setSelectedSlotId(null);
    setAvailableSlots([]);
    try {
      const { data } = await api.get(`/patients/available-slots`, {
        params: { doctorId: doctor._id, date: dateStr },
      });
      setAvailableSlots(data.slots || []);
    } catch (err) {
      console.log("Error loading available slots", err);
      dispatch(showToast({ message: "Could not load slots", type: "error" }));
    }
  };

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Backend expects a composite slotId token: "doctorId|date|startTime"
      const slotToken = selectedSlotId || `${doctor._id}|${selectedDate}|${convert12To24(selectedTime)}`;

      await api.post("/appointments/book", { slotId: slotToken });
      dispatch(showToast({ message: "Appointment booked successfully!", type: "success" }));
      navigate("/patient/appointments");
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error;
      dispatch(showToast({ message: serverMessage || "Failed to book appointment.", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  if (!doctor) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-blue-600 font-medium">Loading doctor info...</p>
      </div>
    </div>
  );

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString("default", { month: "long" });
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const dayCells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const doctorImage = doctor?.profileImage || doctor?.user?.profileImage || "";
  const doctorInitial = doctor?.user?.name?.charAt(0) || "D";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 50%, #e8f4ff 100%)",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── PAGE HEADER ── */}
      <div
        style={{
          background: "linear-gradient(90deg, #1d4ed8 0%, #2563eb 60%, #38bdf8 100%)",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 4px 20px rgba(37,99,235,0.25)",
        }}
      >
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff", flexShrink: 0,
            }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
          </p>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#fff" }}>
            {step === 1 ? "Select Date & Time" : "Confirm Booking"}
          </h1>
        </div>

        {/* Step pills */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? "32px" : "10px",
                height: "10px",
                borderRadius: "5px",
                background: s <= step ? "#fff" : "rgba(255,255,255,0.35)",
                transition: "width 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 0 }}>

        {/* ── LEFT SIDEBAR ── */}
        <div
          style={{
            width: "280px",
            flexShrink: 0,
            padding: "28px 24px",
            background: "#fff",
            borderRight: "1px solid #dbeafe",
            minHeight: "calc(100vh - 72px)",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
          className="hidden lg:flex"
        >
          {/* Doctor card */}
          <div
            style={{
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid #bfdbfe",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "52px", height: "52px", borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: "800", fontSize: "20px",
                marginBottom: "12px",
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                overflow: "hidden",
              }}
            >
              {doctorImage ? (
                <img src={doctorImage} alt={doctor.user?.name || "Doctor"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                doctorInitial
              )}
            </div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e3a5f" }}>
              {doctor.user?.name}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#2563eb", fontWeight: "500" }}>
              {doctor.specialization}
            </p>
          </div>

          {/* Info rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
            {[
              { icon: <Clock size={15} />, text: `${doctor.availability?.consultationDuration || 40} min consultation` },
              { icon: <Globe size={15} />, text: "India Standard Time" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px", height: "32px", borderRadius: "8px",
                    background: "#eff6ff", border: "1px solid #bfdbfe",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#2563eb", flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <span style={{ fontSize: "13px", color: "#334155", fontWeight: "500" }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Selected summary */}
          {step >= 2 && selectedDate && (
            <div
              style={{
                background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #bfdbfe",
              }}
            >
              <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Your Selection
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Calendar size={15} style={{ color: "#2563eb", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>
                    {new Date(selectedDate).toDateString()}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Clock size={15} style={{ color: "#2563eb", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>{selectedTime}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div style={{ flex: 1, padding: "28px 32px" }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ maxWidth: "900px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 300px",
                  gap: "24px",
                  alignItems: "start",
                }}
                className="booking-grid"
              >
                {/* ── CALENDAR ── */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "18px",
                    padding: "28px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 4px 24px rgba(37,99,235,0.07)",
                  }}
                >
                  {/* Month nav */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <button
                      onClick={() => setCurrentMonth(new Date(year, monthIndex - 1, 1))}
                      style={{
                        width: "38px", height: "38px", borderRadius: "10px",
                        border: "1px solid #dbeafe", background: "#f8faff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "#2563eb",
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e3a5f" }}>
                      {monthName} {year}
                    </h3>
                    <button
                      onClick={() => setCurrentMonth(new Date(year, monthIndex + 1, 1))}
                      style={{
                        width: "38px", height: "38px", borderRadius: "10px",
                        border: "1px solid #dbeafe", background: "#f8faff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "#2563eb",
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Day labels */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div key={d} style={{ textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#94a3b8", padding: "6px 0", letterSpacing: "0.04em" }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells — larger, more breathing room */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                    {dayCells.map((day, idx) => {
                      if (!day) return <div key={idx} />;

                      const cellDate = new Date(year, monthIndex, day);
                      const dateStr = toLocalDateString(cellDate);
                      const now = new Date(); now.setHours(0, 0, 0, 0);
                      const isPast = cellDate < now;

                      let available = false;
                      if (!isPast) {
                        const weekly = doctor.availability?.weekly || [];
                        const exceptions = doctor.availability?.exceptions || [];
                        const exception = exceptions.find((ex) => ex.date?.split("T")[0] === dateStr);
                        if (exception) available = !exception.isUnavailable;
                        else {
                          const dayName = cellDate.toLocaleDateString("en-US", { weekday: "long" });
                          const rule = weekly.find((w) => w.day === dayName);
                          available = rule?.isActive;
                        }
                      }

                      const isSelected = selectedDate === dateStr;
                      const isToday = toLocalDateString(new Date()) === dateStr;

                      return (
                        <button
                          key={idx}
                          disabled={!available}
                          onClick={() => available && handleDateSelect(dateStr)}
                          style={{
                            height: "52px",
                            borderRadius: "12px",
                            fontSize: "15px",
                            fontWeight: isSelected || isToday ? "700" : "500",
                            border: isSelected
                              ? "none"
                              : isToday
                              ? "2px solid #2563eb"
                              : available
                              ? "1px solid #dbeafe"
                              : "none",
                            background: isSelected
                              ? "linear-gradient(135deg, #2563eb, #38bdf8)"
                              : available
                              ? "#f8faff"
                              : "transparent",
                            color: isSelected
                              ? "#fff"
                              : available
                              ? "#1e3a5f"
                              : "#cbd5e1",
                            cursor: available ? "pointer" : "default",
                            boxShadow: isSelected ? "0 4px 14px rgba(37,99,235,0.35)" : "none",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (available && !isSelected) e.currentTarget.style.background = "#dbeafe";
                          }}
                          onMouseLeave={(e) => {
                            if (available && !isSelected) e.currentTarget.style.background = "#f8faff";
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── TIME SLOTS ── */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "18px",
                    padding: "24px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 4px 24px rgba(37,99,235,0.07)",
                  }}
                >
                  <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                    Available Times
                  </h4>
                  <p style={{ margin: "0 0 18px", fontSize: "12px", color: "#64748b" }}>
                    {selectedDate ? new Date(selectedDate).toDateString() : "Select a date first"}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "480px", overflowY: "auto", paddingRight: "4px" }}>
                    {selectedDate && availableSlots.length > 0 ? (
                      availableSlots.map((slot) => {
                        const slotTime = typeof slot === "string" ? slot : slot.startTime;
                        const slotId = typeof slot === "string" ? null : slot._id;
                        const isActive = selectedTime === slotTime;

                        return (
                          <div key={slotId || slotTime}>
                            {isActive ? (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <div
                                  style={{
                                    flex: 1,
                                    padding: "13px 14px",
                                    borderRadius: "12px",
                                    background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                                    color: "#fff",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                                  }}
                                >
                                  <CheckCircle2 size={16} />
                                  {slotTime}
                                </div>
                                <button
                                  onClick={() => setStep(2)}
                                  style={{
                                    padding: "13px 16px",
                                    borderRadius: "12px",
                                    background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                                    color: "#fff",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    border: "none",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Next →
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTime(slotTime);
                                  setSelectedSlotId(slotId);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "13px 14px",
                                  borderRadius: "12px",
                                  background: "#f8faff",
                                  border: "1px solid #dbeafe",
                                  color: "#334155",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#dbeafe";
                                  e.currentTarget.style.borderColor = "#93c5fd";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#f8faff";
                                  e.currentTarget.style.borderColor = "#dbeafe";
                                }}
                              >
                                <Clock size={14} style={{ color: "#60a5fa", flexShrink: 0 }} />
                                {slotTime}
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          padding: "32px 16px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontSize: "13px",
                        }}
                      >
                        <Clock size={28} style={{ color: "#bfdbfe", margin: "0 auto 10px" }} />
                        {selectedDate ? "No slots available for this day" : "Pick a date to see slots"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Confirm */}
          {step === 2 && (
            <div style={{ maxWidth: "540px" }}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  padding: "32px",
                  border: "1px solid #dbeafe",
                  boxShadow: "0 4px 24px rgba(37,99,235,0.08)",
                }}
              >
                <h2 style={{ margin: "0 0 24px", fontSize: "20px", fontWeight: "700", color: "#1e3a5f" }}>
                  Review & Confirm
                </h2>

                {/* Doctor info */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                    borderRadius: "14px",
                    padding: "20px",
                    border: "1px solid #bfdbfe",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "48px", height: "48px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: "800", fontSize: "18px",
                        boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                        flexShrink: 0,
                        overflow: "hidden",
                      }}
                    >
                      {doctorImage ? (
                        <img src={doctorImage} alt={doctor.user?.name || "Doctor"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        doctorInitial
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                        {doctor.user?.name}
                      </p>
                      <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#2563eb", fontWeight: "500" }}>
                        {doctor.specialization}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Booking details */}
                <div
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #dbeafe",
                    overflow: "hidden",
                    marginBottom: "24px",
                  }}
                >
                  {[
                    { icon: <Calendar size={15} />, label: "Date", value: selectedDate ? new Date(selectedDate).toDateString() : "—" },
                    { icon: <Clock size={15} />, label: "Time", value: selectedTime || "—" },
                    { icon: <Clock size={15} />, label: "Duration", value: `${doctor.availability?.consultationDuration || 40} minutes` },
                  ].map((row, i, arr) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "14px 18px",
                        borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none",
                        background: i % 2 === 0 ? "#fafcff" : "#fff",
                      }}
                    >
                      <div
                        style={{
                          width: "30px", height: "30px", borderRadius: "8px",
                          background: "#eff6ff", border: "1px solid #bfdbfe",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#2563eb", flexShrink: 0,
                        }}
                      >
                        {row.icon}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {row.label}
                        </p>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1e3a5f" }}>
                          {row.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "15px",
                    borderRadius: "12px",
                    background: loading
                      ? "#93c5fd"
                      : "linear-gradient(135deg, #2563eb, #38bdf8)",
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: "700",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: loading ? "none" : "0 6px 20px rgba(37,99,235,0.35)",
                    transition: "all 0.2s ease",
                    letterSpacing: "0.02em",
                  }}
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Booking...</>
                  ) : (
                    <><CheckCircle2 size={18} /> Confirm Appointment</>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}