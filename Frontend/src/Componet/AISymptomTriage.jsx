import React, { useState } from "react";
import {
  Sparkles, AlertTriangle, ShieldAlert, CheckCircle2, Clock,
  Star, Stethoscope, ArrowRight, RefreshCw, HeartPulse,
  Info, Loader2, Calendar, PhoneCall, ChevronRight, HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../pages/util/api";

export default function AISymptomTriage({ onSelectSpecialty }) {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (textToAnalyze) => {
    const query = (typeof textToAnalyze === "string" ? textToAnalyze : symptoms).trim();
    if (!query || query.length < 3) {
      setError("Please describe your symptoms in a bit more detail (at least 3 characters).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await API.post("/triage/analyze", { symptoms: query });
      setResult(data);
      if (onSelectSpecialty && data?.triage?.specialty) {
        onSelectSpecialty(data.triage.specialty);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze symptoms with AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetTriage = () => {
    setResult(null);
    setSymptoms("");
    setError(null);
  };

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case "EMERGENCY":
        return {
          title: "EMERGENCY — IMMEDIATE ATTENTION REQUIRED",
          bg: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
          border: "#ef4444",
          badgeBg: "#ef4444",
          badgeColor: "#fff",
          textColor: "#991b1b",
          icon: <ShieldAlert size={24} className="text-red-600 animate-pulse" />,
          glow: "0 0 24px rgba(239, 68, 68, 0.35)",
        };
      case "HIGH":
        return {
          title: "HIGH URGENCY — SAME-DAY MEDICAL ATTENTION RECOMMENDED",
          bg: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
          border: "#f97316",
          badgeBg: "#f97316",
          badgeColor: "#fff",
          textColor: "#9a3412",
          icon: <AlertTriangle size={24} className="text-orange-600" />,
          glow: "0 0 16px rgba(249, 115, 22, 0.2)",
        };
      case "MEDIUM":
        return {
          title: "MEDIUM URGENCY — SCHEDULE A CONSULTATION SOON",
          bg: "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)",
          border: "#eab308",
          badgeBg: "#ca8a04",
          badgeColor: "#fff",
          textColor: "#854d0e",
          icon: <Info size={24} className="text-yellow-600" />,
          glow: "0 0 12px rgba(234, 179, 8, 0.15)",
        };
      case "LOW":
      default:
        return {
          title: "LOW URGENCY — ROUTINE CARE & HOME MANAGEMENT",
          bg: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
          border: "#22c55e",
          badgeBg: "#16a34a",
          badgeColor: "#fff",
          textColor: "#166534",
          icon: <CheckCircle2 size={24} className="text-green-600" />,
          glow: "0 0 12px rgba(34, 197, 94, 0.15)",
        };
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f8faff 50%, #f0f4ff 100%)",
        borderRadius: "20px",
        border: "1.5px solid #dbeafe",
        padding: "24px 28px",
        marginBottom: "32px",
        boxShadow: "0 10px 30px -10px rgba(59, 130, 246, 0.12)",
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #3b82f6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)" }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "800", color: "#1e3a8a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              AI Symptom Triage & Doctor Matching
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
              Type your symptoms or ask a health question to get instant clinical triage, first-aid care, and matched specialists.
            </p>
          </div>
        </div>

        {result && (
          <button
            onClick={resetTriage}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "10px",
              background: "#eff6ff", border: "1px solid #bfdbfe",
              color: "#1d4ed8", fontSize: "12.5px", fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <RefreshCw size={13} /> Check New Symptoms
          </button>
        )}
      </div>

      {/* Input Form */}
      {!result && (
        <>
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Describe what you are feeling... (e.g., 'I have a sharp pain in my chest and my left arm feels numb' or 'Twisted my ankle, which exercises to do?')"
              rows={3}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "14px",
                border: error ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                fontSize: "14px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
                background: "#fff",
                resize: "vertical",
                transition: "border 0.2s",
                lineHeight: "1.5"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => !error && (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>

          {error && (
            <p style={{ color: "#dc2626", fontSize: "13px", margin: "-4px 0 12px 2px", display: "flex", alignItems: "center", gap: "5px" }}>
              <AlertTriangle size={14} /> {error}
            </p>
          )}

          {/* Action Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !symptoms.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 24px",
                borderRadius: "12px",
                background: loading || !symptoms.trim()
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #2563eb, #4f46e5)",
                border: "none",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: loading || !symptoms.trim() ? "not-allowed" : "pointer",
                boxShadow: loading || !symptoms.trim() ? "none" : "0 4px 14px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s"
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing Symptoms with AI...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyze Symptoms & Match Doctors
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Results View */}
      {result && (
        <div style={{ marginTop: "12px" }}>
          {(() => {
            const triage = result.triage || {};
            const config = getUrgencyConfig(triage.urgency);

            return (
              <div>
                {/* URGENCY BANNER */}
                <div
                  style={{
                    background: config.bg,
                    border: `2px solid ${config.border}`,
                    borderRadius: "16px",
                    padding: "18px 22px",
                    boxShadow: config.glow,
                    marginBottom: "20px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ marginTop: "2px" }}>{config.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "800", background: config.badgeBg, color: config.badgeColor, padding: "3px 10px", borderRadius: "999px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {triage.urgency}
                        </span>
                        <h3 style={{ fontSize: "16px", fontWeight: "800", color: config.textColor, margin: 0 }}>
                          {config.title}
                        </h3>
                      </div>

                      {triage.urgency === "EMERGENCY" && (
                        <div style={{ background: "#dc2626", color: "#fff", padding: "8px 14px", borderRadius: "10px", margin: "10px 0", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                          <PhoneCall size={16} />
                          EMERGENCY NOTICE: If this is life-threatening, call emergency medical services (112 or 911) immediately. Do not delay.
                        </div>
                      )}

                      <p style={{ fontSize: "14px", color: config.textColor, margin: "6px 0 0", lineHeight: "1.5", fontWeight: "600" }}>
                        {triage.reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI ADVICE & FIRST AID BOX */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "18px 20px",
                    marginBottom: "24px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <HeartPulse size={18} color="#2563eb" />
                    <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      AI Health Guidance & Recommended Steps
                    </h4>
                  </div>
                  <p style={{ fontSize: "14px", color: "#334155", lineHeight: "1.6", margin: "0 0 12px" }}>
                    {triage.advice}
                  </p>

                  {/* Differential conditions */}
                  {triage.possibleConditions && triage.possibleConditions.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "10px", borderTop: "1px dashed #e2e8f0" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Possible Differential Diagnoses:</span>
                      {triage.possibleConditions.map((cond, i) => (
                        <span key={i} style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "999px", padding: "2px 10px", fontSize: "12px", fontWeight: "600" }}>
                          {cond}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* MATCHED SPECIALIST HEADING */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <Stethoscope size={18} color="#2563eb" />
                      Recommended Specialist: <span style={{ color: "#2563eb" }}>{triage.specialty}</span>
                    </h4>
                    <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0" }}>
                      {result.matchedDoctors?.length || 0} top-rated specialist{result.matchedDoctors?.length !== 1 ? "s" : ""} matched and ranked by rating & earliest slot:
                    </p>
                  </div>
                </div>

                {/* MATCHED DOCTORS GRID */}
                {result.matchedDoctors && result.matchedDoctors.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                    {result.matchedDoctors.map((doc, idx) => (
                      <div
                        key={doc._id || idx}
                        style={{
                          background: "#fff",
                          border: "1.5px solid #e2e8f0",
                          borderRadius: "16px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          transition: "all 0.2s",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#93c5fd";
                          e.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(59, 130, 246, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                        }}
                      >
                        <div>
                          {/* Doctor header */}
                          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg,#dbeafe,#eff6ff)", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                              {doc.profileImage ? (
                                <img src={doc.profileImage} alt={doc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <Stethoscope size={22} color="#2563eb" />
                              )}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                              <h5 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {doc.name}
                              </h5>
                              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                                {doc.specialization} · {doc.yearsOfExperience} yrs exp
                              </p>
                            </div>
                          </div>

                          {/* Rating & fees */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12.5px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontWeight: "700" }}>
                              <Star size={14} fill="#f59e0b" color="#f59e0b" />
                              {doc.averageRating}
                              <span style={{ color: "#94a3b8", fontWeight: "400" }}>({doc.reviewCount || 0})</span>
                            </span>
                            <span style={{ fontWeight: "700", color: "#0f172a" }}>
                              ₹{doc.fees} <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400" }}>fee</span>
                            </span>
                          </div>

                          {/* Soonest slot chip */}
                          {doc.soonestSlot ? (
                            <div style={{ background: doc.soonestSlot.isToday ? "#eff6ff" : "#f8fafc", border: doc.soonestSlot.isToday ? "1px solid #bfdbfe" : "1px solid #e2e8f0", borderRadius: "10px", padding: "6px 10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", marginBottom: "14px" }}>
                              <Clock size={13} color={doc.soonestSlot.isToday ? "#2563eb" : "#64748b"} />
                              <span style={{ color: doc.soonestSlot.isToday ? "#1e40af" : "#475569", fontWeight: "600" }}>
                                {doc.soonestSlot.isToday ? "⚡ Next slot TODAY:" : "📅 Next slot:"} {doc.soonestSlot.time} ({doc.soonestSlot.date})
                              </span>
                            </div>
                          ) : (
                            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "6px 10px", fontSize: "12px", color: "#94a3b8", marginBottom: "14px" }}>
                              No immediate slot this week
                            </div>
                          )}
                        </div>

                        {/* CTA button */}
                        <button
                          onClick={() => navigate(`/patient/calendar/${doc._id}`)}
                          style={{
                            width: "100%",
                            padding: "9px 14px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                            border: "none",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            transition: "background 0.15s"
                          }}
                        >
                          Book Appointment
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "13px" }}>
                    No specific {triage.specialty} registered yet. Please consult a General Physician.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
