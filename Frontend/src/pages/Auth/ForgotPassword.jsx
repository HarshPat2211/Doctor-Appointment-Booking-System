import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Mail, Loader2 } from "lucide-react";
import API from "../util/api";
import { showToast } from "../../Redux/toastSlice";

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = String(email || "").trim();
    if (!cleanEmail) {
      dispatch(showToast({ message: "Email is required", type: "error" }));
      return;
    }

    try {
      setLoading(true);
      const { data } = await API.post("/auth/forgot-password", { email: cleanEmail });
      dispatch(showToast({ message: data?.message || "Reset link sent", type: "success" }));
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Failed to send reset link", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #eff6ff 0%, #ffffff 50%, #e0f2fe 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "24px",
          padding: "36px 32px",
          border: "1px solid #dbeafe",
          boxShadow: "0 20px 60px rgba(37,99,235,0.12)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
          Forgot Password
        </h1>
        <p style={{ margin: "8px 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
          Enter your email and we will send you a secure reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            <Mail size={11} /> Email Address
          </label>

          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#60a5fa" }}>
              <Mail size={15} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              style={{
                width: "100%",
                padding: "11px 14px 11px 40px",
                borderRadius: "10px",
                border: "1px solid #dbeafe",
                background: "#f8faff",
                fontSize: "14px",
                color: "#1e3a5f",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #38bdf8)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
          <Link to="/login" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
