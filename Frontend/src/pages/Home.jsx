import React from "react";
import { useNavigate } from "react-router-dom";
import PublicHeader from "../Componet/PublicHeader";
import PublicFooter from "../Componet/PublicFooter";
import gen from "../assets/General Physicians.jpeg";
import dent from "../assets/Dentiist.jpeg";
import Neurologists from "../assets/Neurologists.jpeg";
import Pediatrics from "../assets/Pediatrics.jpeg";
import den from "../assets/Dermatologists.jpeg";
import Cardiologists from "../assets/Cardiologists.jpeg";

const specialties = [
  { name: "General Physicians", count: "45", img: gen, color: "#eff6ff", border: "#bfdbfe" },
  { name: "Dentists", count: "38", img: dent, color: "#ecfeff", border: "#a5f3fc" },
  { name: "Dermatologists", count: "32", img: den, color: "#f0fdf4", border: "#bbf7d0" },
  { name: "Neurologists", count: "28", img: Neurologists, color: "#f5f3ff", border: "#ddd6fe" },
  { name: "Pediatricians", count: "42", img: Pediatrics, color: "#fff1f2", border: "#fecdd3" },
  { name: "Cardiologists", count: "35", img: Cardiologists, color: "#fffbeb", border: "#fde68a" },
];

const stats = [
  { value: "500+", label: "Expert Doctors", icon: "🩺" },
  { value: "50k+", label: "Happy Patients", icon: "❤️" },
  { value: "100k+", label: "Appointments", icon: "📅" },
  { value: "4.9★", label: "Average Rating", icon: "⭐" },
];

const steps = [
  {
    num: "01",
    title: "Search a Doctor",
    desc: "Browse our network of verified specialists across all medical fields.",
    icon: "🔍",
  },
  {
    num: "02",
    title: "Check Availability",
    desc: "View real-time schedules and pick the time slot that fits your day.",
    icon: "🗓️",
  },
  {
    num: "03",
    title: "Book & Get Care",
    desc: "Confirm in seconds and receive expert care at your chosen time.",
    icon: "✅",
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        .hero-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; pointer-events: none; }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }
        .fade-up-4 { animation: fadeUp 0.7s 0.45s ease both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .spec-card:hover .spec-img { transform: scale(1.08); }
        .spec-card:hover { box-shadow: 0 12px 36px rgba(37,99,235,0.15); transform: translateY(-4px); }
        .step-card:hover { box-shadow: 0 12px 36px rgba(37,99,235,0.12); transform: translateY(-3px); }
        .btn-primary-home {
          background: linear-gradient(135deg, #2563eb, #38bdf8);
          color: #fff; border: none; border-radius: 12px;
          padding: 14px 32px; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          box-shadow: 0 6px 20px rgba(37,99,235,0.35);
          transition: all 0.2s ease;
        }
        .btn-primary-home:hover { box-shadow: 0 10px 28px rgba(37,99,235,0.45); transform: translateY(-2px); }
        .btn-outline-home {
          background: transparent; color: #2563eb;
          border: 2px solid #bfdbfe; border-radius: 12px;
          padding: 14px 32px; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: all 0.2s ease;
        }
        .btn-outline-home:hover { background: #eff6ff; border-color: #93c5fd; transform: translateY(-2px); }
      `}</style>

      <PublicHeader />

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          background: "linear-gradient(160deg, #eff6ff 0%, #ffffff 45%, #e0f2fe 100%)",
          padding: "80px 24px 100px",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <div className="hero-blob" style={{ width: 500, height: 500, background: "#bfdbfe", top: -120, right: -100 }} />
        <div className="hero-blob" style={{ width: 300, height: 300, background: "#7dd3fc", bottom: -60, left: -60 }} />

        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", gap: "60px", flexWrap: "wrap" }}>

          {/* Left text */}
          <div style={{ flex: "1 1 460px", position: "relative", zIndex: 1 }}>
            {/* Badge */}
            <div
              className="fade-up"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "#eff6ff", border: "1px solid #bfdbfe",
                borderRadius: "20px", padding: "6px 14px",
                fontSize: "12px", fontWeight: "700", color: "#2563eb",
                marginBottom: "20px", letterSpacing: "0.04em",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Trusted by 50,000+ Patients
            </div>

            <h1
              className="fade-up-2"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(36px, 5vw, 58px)",
                fontWeight: "800",
                color: "#0f172a",
                lineHeight: 1.12,
                margin: "0 0 20px",
                letterSpacing: "-0.02em",
              }}
            >
              Your Health,<br />
              <span style={{ background: "linear-gradient(135deg, #2563eb, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Our Priority
              </span>
            </h1>

            <p
              className="fade-up-3"
              style={{ fontSize: "17px", color: "#475569", lineHeight: 1.7, margin: "0 0 36px", maxWidth: "440px" }}
            >
              Book appointments with top-rated doctors instantly. Quality healthcare made simple, accessible, and personal.
            </p>

            <div className="fade-up-4" style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <button className="btn-primary-home" onClick={() => navigate("/browse-doctors")}>
                Find Doctors →
              </button>
              <button className="btn-outline-home" onClick={() => navigate("/doctor-registration/step1")}>
                Join as Doctor
              </button>
            </div>

            {/* Trust row */}
            <div
              className="fade-up-4"
              style={{ marginTop: "40px", display: "flex", alignItems: "center", gap: "12px" }}
            >
              {/* Stacked avatars */}
              <div style={{ display: "flex" }}>
                {["#2563eb", "#0891b2", "#7c3aed", "#059669"].map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: "34px", height: "34px", borderRadius: "50%",
                      background: `linear-gradient(135deg, ${c}, ${c}99)`,
                      border: "2px solid #fff",
                      marginLeft: i === 0 ? 0 : "-10px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: "12px", fontWeight: "700",
                      zIndex: 4 - i,
                    }}
                  >
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>4.9 ★★★★★</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>from 12,000+ reviews</p>
              </div>
            </div>
          </div>

          {/* Right — floating doctor cards */}
          <div style={{ flex: "1 1 380px", position: "relative", minHeight: "380px", zIndex: 1 }}>

            {/* Main big circle image */}
            <div
              style={{
                width: "320px", height: "320px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                margin: "0 auto",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 24px 64px rgba(37,99,235,0.3)",
                overflow: "hidden",
                border: "6px solid #fff",
                position: "relative",
              }}
            >
              <img
                src={gen}
                alt="Doctor"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Floating card 1 — verified */}
            <div
              style={{
                position: "absolute", top: "20px", left: "-10px",
                background: "#fff", borderRadius: "14px",
                padding: "12px 16px", border: "1px solid #dbeafe",
                boxShadow: "0 8px 24px rgba(37,99,235,0.12)",
                display: "flex", alignItems: "center", gap: "10px",
                animation: "fadeUp 0.9s 0.3s ease both",
              }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "16px" }}>✓</div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: "#1e3a5f" }}>Verified Doctors</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>500+ specialists</p>
              </div>
            </div>

            {/* Floating card 2 — next appt */}
            <div
              style={{
                position: "absolute", bottom: "30px", right: "-10px",
                background: "#fff", borderRadius: "14px",
                padding: "12px 16px", border: "1px solid #dbeafe",
                boxShadow: "0 8px 24px rgba(37,99,235,0.12)",
                animation: "fadeUp 0.9s 0.5s ease both",
                minWidth: "170px",
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Next Available</p>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>Today, 3:00 PM</p>
              <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                <span style={{ fontSize: "11px", color: "#059669", fontWeight: "600" }}>Available Now</span>
              </div>
            </div>

            {/* Floating card 3 — rating */}
            <div
              style={{
                position: "absolute", bottom: "90px", left: "-20px",
                background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                borderRadius: "14px", padding: "12px 16px",
                boxShadow: "0 8px 24px rgba(37,99,235,0.3)",
                color: "#fff",
                animation: "fadeUp 0.9s 0.7s ease both",
              }}
            >
              <p style={{ margin: 0, fontSize: "22px", fontWeight: "800" }}>4.9 ⭐</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", opacity: 0.8 }}>Patient Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb, #38bdf8)", padding: "36px 24px" }}>
        <div
          style={{
            maxWidth: "1000px", margin: "0 auto",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "24px", textAlign: "center",
          }}
        >
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>{s.icon}</div>
              <p style={{ margin: 0, fontSize: "30px", fontWeight: "800", color: "#fff", fontFamily: "'Sora',sans-serif" }}>{s.value}</p>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: "500" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SPECIALTIES SECTION
      ══════════════════════════════════════════ */}
      <section style={{ padding: "88px 24px", background: "#fff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

          {/* Section header */}
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <span style={{
              display: "inline-block", background: "#eff6ff", color: "#2563eb",
              fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em",
              textTransform: "uppercase", padding: "5px 14px", borderRadius: "20px",
              border: "1px solid #bfdbfe", marginBottom: "14px",
            }}>
              Specializations
            </span>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: "800", color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              Browse by Specialty
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px", margin: 0 }}>
              Find the right specialist for your healthcare needs
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {specialties.map((s, i) => (
              <div
                key={i}
                className="spec-card"
                onClick={() => navigate("/browse-doctors")}
                style={{
                  background: "#fff", borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden", cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                }}
              >
                {/* Round image area */}
                <div style={{ padding: "28px 28px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "110px", height: "110px", borderRadius: "50%",
                      overflow: "hidden",
                      border: `4px solid ${s.border}`,
                      background: s.color,
                      boxShadow: `0 8px 24px ${s.border}88`,
                      marginBottom: "18px",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={s.img} alt={s.name}
                      className="spec-img"
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.35s ease" }}
                    />
                  </div>

                  <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "#1e3a5f", textAlign: "center" }}>
                    {s.name}
                  </h4>
                  <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>{s.count} doctors available</p>

                  <div
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      padding: "6px 16px", borderRadius: "20px",
                      background: s.color, border: `1px solid ${s.border}`,
                      fontSize: "12px", fontWeight: "600", color: "#2563eb",
                    }}
                  >
                    View Doctors →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section style={{ padding: "88px 24px", background: "linear-gradient(160deg, #f0f7ff 0%, #fff 60%, #e8f4ff 100%)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <span style={{
              display: "inline-block", background: "#eff6ff", color: "#2563eb",
              fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em",
              textTransform: "uppercase", padding: "5px 14px", borderRadius: "20px",
              border: "1px solid #bfdbfe", marginBottom: "14px",
            }}>
              Simple Process
            </span>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px,4vw,40px)", fontWeight: "800", color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              How It Works
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px", margin: 0 }}>Book your appointment in three simple steps</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {steps.map((step, i) => (
              <div
                key={i}
                className="step-card"
                style={{
                  background: "#fff", borderRadius: "20px",
                  padding: "36px 28px", textAlign: "center",
                  border: "1px solid #dbeafe",
                  boxShadow: "0 2px 16px rgba(37,99,235,0.06)",
                  transition: "all 0.25s ease",
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Background step number watermark */}
                <div style={{
                  position: "absolute", top: "-10px", right: "14px",
                  fontSize: "72px", fontWeight: "900", color: "#dbeafe",
                  fontFamily: "'Sora',sans-serif", lineHeight: 1, pointerEvents: "none",
                  userSelect: "none",
                }}>
                  {step.num}
                </div>

                {/* Icon circle */}
                <div
                  style={{
                    width: "64px", height: "64px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                    border: "2px solid #bfdbfe",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "28px", margin: "0 auto 20px",
                    boxShadow: "0 4px 14px rgba(37,99,235,0.12)",
                  }}
                >
                  {step.icon}
                </div>

                <h4 style={{ fontFamily: "'Sora',sans-serif", fontSize: "18px", fontWeight: "700", color: "#1e3a5f", margin: "0 0 10px" }}>
                  {step.title}
                </h4>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.65, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #38bdf8 100%)", position: "relative", overflow: "hidden" }}>
        <div className="hero-blob" style={{ width: 400, height: 400, background: "#fff", top: -150, right: -100, opacity: 0.07 }} />
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px,4vw,44px)", fontWeight: "800", color: "#fff", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            Ready to Take Charge of Your Health?
          </h2>
          <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.8)", margin: "0 0 36px", lineHeight: 1.65 }}>
            Join thousands of patients who book smarter, healthier appointments every day.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/browse-doctors")}
              style={{
                padding: "14px 36px", borderRadius: "12px",
                background: "#fff", color: "#2563eb",
                fontWeight: "700", fontSize: "15px",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
            >
              Book Appointment
            </button>
            <button
              onClick={() => navigate("/doctor-registration/step1")}
              style={{
                padding: "14px 36px", borderRadius: "12px",
                background: "rgba(255,255,255,0.15)", color: "#fff",
                fontWeight: "700", fontSize: "15px",
                border: "2px solid rgba(255,255,255,0.4)",
                cursor: "pointer", fontFamily: "inherit",
                backdropFilter: "blur(4px)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            >
              Become a Doctor
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}