import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Users, Calendar, Shield,
  Smartphone, CreditCard, BarChart2, Bell, Zap, Lock,
} from "lucide-react";
import PublicHeader from "../Componet/PublicHeader";
import PublicFooter from "../Componet/PublicFooter";
import { useSiteName } from "../utils/siteName";

/* ─────────────────────────────────────────
   Lazy-reveal hook + wrapper
───────────────────────────────────────── */
function useLazyReveal(threshold = 0.12) {
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
    <div
      ref={ref}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ${delay}ms ease, transform 0.6s ${delay}ms ease`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   Reusable pieces
───────────────────────────────────────── */
const Badge = ({ label }) => (
  <span style={{
    display: "inline-block",
    background: "#eff6ff", color: "#2563eb",
    fontSize: "11px", fontWeight: "700",
    letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "5px 14px", borderRadius: "20px",
    border: "1px solid #bfdbfe", marginBottom: "12px",
  }}>
    {label}
  </span>
);

const CheckItem = ({ text, color = "#2563eb" }) => (
  <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
    <CheckCircle2 size={16} style={{ color, flexShrink: 0, marginTop: "3px" }} />
    <span style={{ fontSize: "14px", color: "#475569", lineHeight: 1.65 }}>{text}</span>
  </li>
);

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function HowItWorks() {
  const navigate = useNavigate();
  const siteName = useSiteName();

  const S = { // shared section wrapper style
    padding: "88px 24px",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans','Segoe UI',sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        .hiw-card { transition: all 0.25s ease; }
        .hiw-card:hover { box-shadow: 0 14px 40px rgba(37,99,235,0.13); transform: translateY(-4px); }
        .feat-card { transition: all 0.25s ease; }
        .feat-card:hover { box-shadow: 0 10px 28px rgba(37,99,235,0.11); transform: translateY(-3px); }
      `}</style>

      <PublicHeader sticky />

      {/* ══ HERO ══ */}
      <section style={{
        background: "linear-gradient(160deg, #eff6ff 0%, #ffffff 50%, #e0f2fe 100%)",
        padding: "72px 24px 80px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", background: "#bfdbfe", filter: "blur(90px)", opacity: 0.28, top: -100, right: -80, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "#7dd3fc", filter: "blur(80px)", opacity: 0.18, bottom: -60, left: -60, pointerEvents: "none" }} />

        <div style={{ maxWidth: "700px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Reveal delay={0}>
            <Badge label="Platform Guide" />
            <h1 style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: "clamp(32px,5vw,52px)", fontWeight: "800",
              color: "#0f172a", margin: "0 0 18px", letterSpacing: "-0.02em", lineHeight: 1.15,
            }}>
              How{" "}
              <span style={{ background: "linear-gradient(135deg,#2563eb,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {siteName}
              </span>{" "}
              Works
            </h1>
            <p style={{ fontSize: "17px", color: "#64748b", lineHeight: 1.7, margin: "0 0 32px" }}>
              Our platform makes healthcare accessible and convenient for patients, doctors, and administrators — here's how we make it seamless.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "Get Started Free →", solid: true, onClick: () => navigate("/signup") },
                { label: "Browse Doctors", solid: false, onClick: () => navigate("/browse-doctors") },
              ].map((b, i) => (
                <button key={i} onClick={b.onClick} style={{
                  padding: "13px 28px", borderRadius: "12px",
                  background: b.solid ? "linear-gradient(135deg,#2563eb,#38bdf8)" : "#f8faff",
                  color: b.solid ? "#fff" : "#2563eb",
                  border: b.solid ? "none" : "2px solid #bfdbfe",
                  fontWeight: "700", fontSize: "15px",
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: b.solid ? "0 6px 20px rgba(37,99,235,0.3)" : "none",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                >{b.label}</button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOR PATIENTS ══ */}
      <section style={{ ...S, background: "#fff" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={{ marginBottom: "48px" }}>
              <Badge label="Patients" />
              <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(24px,3.5vw,36px)", fontWeight: "800", color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                Book in 3 Simple Steps
              </h2>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
                Book appointments with qualified doctors quickly and easily
              </p>
            </div>
          </Reveal>

          {/* Step cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "20px", marginBottom: "24px" }}>
            {[
              { num: "01", title: "Sign Up", color: "#2563eb", border: "#bfdbfe", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)", items: ["Create your account with email and password", "Verify your email address", "Complete your patient profile"] },
              { num: "02", title: "Browse & Search", color: "#0891b2", border: "#a5f3fc", bg: "linear-gradient(135deg,#ecfeff,#cffafe)", items: ["Browse doctors by specialty", "View doctor profiles and ratings", "Check available time slots"] },
              { num: "03", title: "Book Appointment", color: "#059669", border: "#a7f3d0", bg: "linear-gradient(135deg,#ecfdf5,#d1fae5)", items: ["Select your preferred time slot", "Get instant confirmation", "Receive smart reminders"] },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="hiw-card" style={{
                  background: "#fff", borderRadius: "18px",
                  border: `1px solid ${s.border}`,
                  padding: "28px",
                  boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
                  position: "relative", overflow: "hidden",
                  height: "100%",
                }}>
                  <div style={{ position: "absolute", top: "-8px", right: "14px", fontSize: "62px", fontWeight: "900", color: s.border, fontFamily: "'Sora',sans-serif", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>{s.num}</div>
                  <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", color: s.color, marginBottom: "16px", fontFamily: "'Sora',sans-serif" }}>{i + 1}</div>
                  <h3 style={{ margin: "0 0 14px", fontSize: "17px", fontWeight: "700", color: "#1e3a5f" }}>{s.title}</h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {s.items.map((item, j) => <CheckItem key={j} text={item} color={s.color} />)}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Patient features bar */}
          <Reveal delay={100}>
            <div style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius: "16px", padding: "22px 28px", border: "1px solid #bfdbfe", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px" }}>
              {[{ icon: <Calendar size={15} />, text: "Manage multiple appointments" }, { icon: <Smartphone size={15} />, text: "Mobile-friendly interface" }, { icon: <Shield size={15} />, text: "HIPAA-compliant privacy" }].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", flexShrink: 0 }}>{f.icon}</div>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e3a5f" }}>{f.text}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOR DOCTORS ══ */}
      <section style={{ ...S, background: "linear-gradient(160deg,#f0f7ff,#fff,#e8f4ff)" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={{ marginBottom: "48px" }}>
              <Badge label="Doctors" />
              <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(24px,3.5vw,36px)", fontWeight: "800", color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                Manage Your Practice Efficiently
              </h2>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>Reach more patients and streamline your schedule</p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "20px", marginBottom: "24px" }}>
            {[
              { num: "01", title: "Register Your Practice", items: ["Create a professional doctor profile", "Add qualifications and certifications", "Set your specialization and services"] },
              { num: "02", title: "Manage Your Schedule", items: ["Set available time slots", "Manage cancellations easily", "View real-time calendar updates"] },
              { num: "03", title: "Accept Bookings", items: ["Receive patient booking requests", "Review patient profiles", "Confirm appointments instantly"] },
              { num: "04", title: "Track Earnings", items: ["View all completed appointments", "Generate revenue reports", "Monitor your performance"] },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="hiw-card" style={{
                  background: "#fff", borderRadius: "18px",
                  border: "1px solid #a5f3fc",
                  padding: "28px",
                  boxShadow: "0 2px 12px rgba(8,145,178,0.06)",
                  position: "relative", overflow: "hidden",
                  height: "100%",
                }}>
                  <div style={{ position: "absolute", top: "-8px", right: "14px", fontSize: "62px", fontWeight: "900", color: "#cffafe", fontFamily: "'Sora',sans-serif", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>{s.num}</div>
                  <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "linear-gradient(135deg,#ecfeff,#cffafe)", border: "1px solid #a5f3fc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", color: "#0891b2", marginBottom: "16px", fontFamily: "'Sora',sans-serif" }}>{i + 1}</div>
                  <h3 style={{ margin: "0 0 14px", fontSize: "17px", fontWeight: "700", color: "#1e3a5f" }}>{s.title}</h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {s.items.map((item, j) => <CheckItem key={j} text={item} color="#0891b2" />)}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div style={{ background: "linear-gradient(135deg,#ecfeff,#cffafe)", borderRadius: "16px", padding: "22px 28px", border: "1px solid #a5f3fc", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px" }}>
              {[{ icon: <Users size={15} />, text: "Expand your patient base" }, { icon: <Calendar size={15} />, text: "Better schedule management" }, { icon: <Shield size={15} />, text: "Data security & privacy" }].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fff", border: "1px solid #a5f3fc", display: "flex", alignItems: "center", justifyContent: "center", color: "#0891b2", flexShrink: 0 }}>{f.icon}</div>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e3a5f" }}>{f.text}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOR ADMINS ══ */}
      <section style={{ ...S, background: "#fff" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={{ marginBottom: "48px" }}>
              <Badge label="Admins" />
              <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(24px,3.5vw,36px)", fontWeight: "800", color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                Complete Platform Control
              </h2>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>Full oversight of operations, users, and analytics</p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "20px", marginBottom: "24px" }}>
            {[
              { emoji: "📊", title: "Dashboard", desc: "Get real-time insights into platform activity:", items: ["Total appointments & revenue", "Active users and doctors", "System performance metrics", "Upcoming appointments"] },
              { emoji: "👥", title: "User Management", desc: "Manage all users on the platform:", items: ["Approve/reject doctor registrations", "View patient profiles", "Handle user complaints & support", "Manage account status"] },
              { emoji: "📅", title: "Appointment Control", desc: "Oversee all bookings and appointments:", items: ["Monitor all appointments", "Cancel or reschedule if needed", "Track no-shows & cancellations", "Generate appointment reports"] },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="hiw-card" style={{
                  background: "#fff", borderRadius: "18px",
                  border: "1px solid #ddd6fe",
                  padding: "28px",
                  boxShadow: "0 2px 12px rgba(124,58,237,0.06)",
                  height: "100%",
                }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "16px" }}>{s.emoji}</div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: "700", color: "#1e3a5f" }}>{s.title}</h3>
                  <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#64748b" }}>{s.desc}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {s.items.map((item, j) => <CheckItem key={j} text={item} color="#7c3aed" />)}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", borderRadius: "16px", padding: "22px 28px", border: "1px solid #ddd6fe", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px" }}>
              {[{ icon: <Shield size={15} />, text: "Full platform oversight" }, { icon: <CreditCard size={15} />, text: "Financial tracking & reports" }, { icon: <Users size={15} />, text: "User approval workflows" }, { icon: <CheckCircle2 size={15} />, text: "System quality assurance" }].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fff", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", flexShrink: 0 }}>{f.icon}</div>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e3a5f" }}>{f.text}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ PLATFORM FEATURES ══ */}
      <section style={{ ...S, background: "linear-gradient(160deg,#f0f7ff,#fff,#e8f4ff)" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Badge label="Features" />
              <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(24px,3.5vw,38px)", fontWeight: "800", color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                Built for Everyone
              </h2>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>Everything you need for modern healthcare management</p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "20px" }}>
            {[
              { icon: <Lock size={20} />, title: "Secure & Safe", desc: "End-to-end encryption and HIPAA-compliant data handling", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
              { icon: <Zap size={20} />, title: "Fast & Reliable", desc: "Real-time updates and 99.9% uptime guarantee", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
              { icon: <Smartphone size={20} />, title: "Mobile Friendly", desc: "Seamless experience on desktop, tablet, and mobile", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
              { icon: <Shield size={20} />, title: "24/7 Support", desc: "Round-the-clock customer support for all users", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
              { icon: <Bell size={20} />, title: "Smart Notifications", desc: "Automated reminders for appointments and updates", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
              { icon: <BarChart2 size={20} />, title: "Analytics", desc: "Detailed reports and insights for doctors and admins", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="feat-card" style={{
                  background: "#fff", borderRadius: "18px",
                  padding: "28px", border: `1px solid ${f.border}`,
                  boxShadow: "0 2px 12px rgba(37,99,235,0.05)",
                  height: "100%",
                }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: f.bg, border: `1px solid ${f.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, marginBottom: "16px" }}>{f.icon}</div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "700", color: "#1e3a5f" }}>{f.title}</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "80px 24px", background: "linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#38bdf8 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "#fff", filter: "blur(100px)", opacity: 0.06, top: -150, right: -80, pointerEvents: "none" }} />
        <Reveal delay={0}>
          <div style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(26px,4vw,42px)", fontWeight: "800", color: "#fff", margin: "0 0 14px", letterSpacing: "-0.02em" }}>
              Ready to Get Started?
            </h2>
            <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.8)", margin: "0 0 36px", lineHeight: 1.65 }}>
              Join thousands of patients and doctors using {siteName} today!
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/signup")} style={{ padding: "14px 36px", borderRadius: "12px", background: "#fff", color: "#2563eb", fontWeight: "700", fontSize: "15px", border: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 20px rgba(0,0,0,0.15)", transition: "all 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
              >Sign Up Now</button>
              <button onClick={() => navigate("/browse-doctors")} style={{ padding: "14px 36px", borderRadius: "12px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: "700", fontSize: "15px", border: "2px solid rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(4px)", transition: "all 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              >Browse Doctors</button>
            </div>
          </div>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  );
}