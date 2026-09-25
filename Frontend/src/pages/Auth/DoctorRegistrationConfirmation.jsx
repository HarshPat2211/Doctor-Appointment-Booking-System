import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, Mail, ArrowRight, Home } from "lucide-react";

export default function DoctorRegistrationConfirmation() {
  const location = useLocation();
  const email = location.state?.email || "";
  const navigate = useNavigate();

  const steps = [
    "Your registration request is now pending admin review",
    `You'll receive an email at ${email || "your address"} once reviewed`,
    "If approved, you'll receive login credentials via email",
    "If rejected, you'll receive a reason for rejection",
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #eff6ff 0%, #ffffff 50%, #e0f2fe 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Blobs */}
      <div style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "#bfdbfe", filter: "blur(90px)", opacity: 0.28, top: -120, right: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "#7dd3fc", filter: "blur(80px)", opacity: 0.2, bottom: -60, left: -60, pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "460px",
        background: "#fff", borderRadius: "24px",
        padding: "40px 36px",
        border: "1px solid #dbeafe",
        boxShadow: "0 20px 60px rgba(37,99,235,0.12)",
        position: "relative", zIndex: 1,
        textAlign: "center",
      }}>

        {/* Success icon */}
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
          border: "2px solid #a7f3d0",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 6px 20px rgba(5,150,105,0.15)",
        }}>
          <CheckCircle2 size={36} style={{ color: "#059669" }} />
        </div>

        <h1 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
          Request Submitted!
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#64748b", lineHeight: 1.65 }}>
          Your registration request has been sent to the admin. Please wait for approval.
        </p>

        {/* What happens next */}
        <div style={{
          background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
          borderRadius: "16px", padding: "20px",
          border: "1px solid #bfdbfe",
          marginBottom: "28px", textAlign: "left",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#fff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", flexShrink: 0 }}>
              <Mail size={14} />
            </div>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>What happens next?</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "11px", fontWeight: "700",
                  flexShrink: 0, marginTop: "1px",
                }}>{i + 1}</div>
                <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>
                  {i === 1 ? (
                    <>You'll receive an email at{" "}
                      <strong style={{ color: "#2563eb" }}>{email || "your address"}</strong>{" "}
                      once reviewed
                    </>
                  ) : step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link
            to="/login"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "13px", borderRadius: "12px",
              background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              color: "#fff", fontSize: "14px", fontWeight: "700",
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(37,99,235,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 8px 26px rgba(37,99,235,0.4)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)"}
          >
            Go to Login <ArrowRight size={16} />
          </Link>

          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "13px", borderRadius: "12px",
              border: "1px solid #dbeafe", background: "#f8faff",
              color: "#64748b", fontSize: "14px", fontWeight: "600",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#93c5fd"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#dbeafe"; }}
          >
            <Home size={16} /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}