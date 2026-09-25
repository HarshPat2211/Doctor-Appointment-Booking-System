import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import API from "../util/api";
import { showToast } from "../../Redux/toastSlice";

export default function ResetPasswordFromLink() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      dispatch(showToast({ message: "Invalid reset link", type: "error" }));
      return;
    }

    if (!newPassword || !confirmPassword) {
      dispatch(showToast({ message: "Please fill all fields", type: "error" }));
      return;
    }

    if (newPassword.length < 6) {
      dispatch(showToast({ message: "Password must be at least 6 characters", type: "error" }));
      return;
    }

    if (newPassword !== confirmPassword) {
      dispatch(showToast({ message: "Passwords do not match", type: "error" }));
      return;
    }

    try {
      setLoading(true);
      const { data } = await API.post(`/auth/reset-password/${token}`, {
        newPassword,
        confirmPassword,
      });
      dispatch(showToast({ message: data?.message || "Password reset successful", type: "success" }));
      navigate("/login");
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Failed to reset password", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const baseInputStyle = {
    width: "100%",
    padding: "11px 40px 11px 40px",
    borderRadius: "10px",
    border: "1px solid #dbeafe",
    background: "#f8faff",
    fontSize: "14px",
    color: "#1e3a5f",
    outline: "none",
    boxSizing: "border-box",
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
          Set New Password
        </h1>
        <p style={{ margin: "8px 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
          Enter a new password for your account.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}><Lock size={11} /> New Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#60a5fa" }}>
                <Lock size={15} />
              </span>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                style={baseInputStyle}
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}><Lock size={11} /> Confirm Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#60a5fa" }}>
                <Lock size={15} />
              </span>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                style={baseInputStyle}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
                <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Updating...
              </>
            ) : (
              "Update Password"
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
