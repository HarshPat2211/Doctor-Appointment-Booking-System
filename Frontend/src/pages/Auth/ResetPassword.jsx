import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showToast } from "../../Redux/toastSlice";
import { loginSuccess } from "../../Redux/authSlice";
import { setDoctorProfile } from "../../Redux/doctorSlice";
import API from "../util/api";
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const location = useLocation();
  const email = location.state?.email || "";

  const [formData, setFormData] = useState({
    email,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleShow = (key) => setShowPasswords((p) => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      dispatch(showToast({ message: "Please fill all fields", type: "error" })); return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      dispatch(showToast({ message: "New passwords do not match", type: "error" })); return;
    }
    if (formData.newPassword.length < 6) {
      dispatch(showToast({ message: "Password must be at least 6 characters", type: "error" })); return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/auth/reset-password", {
        email: formData.email,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      dispatch(loginSuccess(data));
      dispatch(showToast({ message: "Password reset successfully!", type: "success" }));
      if (data.role === "doctor") {
        dispatch(setDoctorProfile(data));
        navigate("/doctor/profile");
      } else {
        navigate("/patient/browse-services");
      }
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || "Failed to reset password", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px 11px 40px",
    borderRadius: "10px",
    border: "1px solid #dbeafe",
    background: "#f8faff",
    fontSize: "14px",
    color: "#1e3a5f",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
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

  const PasswordField = ({ label, name, showKey, placeholder }) => (
    <div>
      <label style={labelStyle}><Lock size={11} /> {label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
          <Lock size={15} />
        </span>
        <input
          type={showPasswords[showKey] ? "text" : "password"}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          required
          style={{
            ...inputStyle,
            paddingRight: "42px",
            ...(name === "confirmPassword" && formData.confirmPassword && formData.confirmPassword !== formData.newPassword
              ? { borderColor: "#fca5a5", background: "#fff5f5" }
              : {}),
          }}
          onFocus={(e) => {
            if (!(name === "confirmPassword" && formData.confirmPassword && formData.confirmPassword !== formData.newPassword))
              e.target.style.borderColor = "#93c5fd";
          }}
          onBlur={(e) => {
            e.target.style.borderColor =
              name === "confirmPassword" && formData.confirmPassword && formData.confirmPassword !== formData.newPassword
                ? "#fca5a5" : "#dbeafe";
          }}
        />
        <button type="button" onClick={() => toggleShow(showKey)} style={{
          position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", padding: 0, display: "flex", alignItems: "center",
        }}>
          {showPasswords[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {name === "confirmPassword" && formData.confirmPassword && formData.confirmPassword !== formData.newPassword && (
        <p style={{ margin: "5px 0 0", fontSize: "11px", color: "#ef4444", fontWeight: "500" }}>
          Passwords do not match
        </p>
      )}
    </div>
  );

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
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Blobs */}
      <div style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "#bfdbfe", filter: "blur(90px)", opacity: 0.28, top: -120, right: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "#7dd3fc", filter: "blur(80px)", opacity: 0.2, bottom: -60, left: -60, pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "440px",
        background: "#fff", borderRadius: "24px",
        padding: "40px 36px",
        border: "1px solid #dbeafe",
        boxShadow: "0 20px 60px rgba(37,99,235,0.12)",
        position: "relative", zIndex: 1,
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: "2px solid #bfdbfe",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 4px 16px rgba(37,99,235,0.12)",
          }}>
            <ShieldCheck size={26} style={{ color: "#2563eb" }} />
          </div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
            Reset Password
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Please set a new password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "22px" }}>

            {/* Email — read only */}
            <div>
              <label style={labelStyle}><Mail size={11} /> Email Address</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  readOnly
                  style={{
                    ...inputStyle,
                    background: "#f1f5f9",
                    color: "#64748b",
                    cursor: "not-allowed",
                    borderColor: "#e2e8f0",
                  }}
                />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                This field is pre-filled and cannot be changed
              </p>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Change Password</span>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>

            <PasswordField label="Current Password" name="currentPassword" showKey="current" placeholder="Enter your current password" />
            <PasswordField label="New Password" name="newPassword" showKey="new" placeholder="Min 6 characters" />
            <PasswordField label="Confirm New Password" name="confirmPassword" showKey="confirm" placeholder="Confirm your new password" />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "13px",
              borderRadius: "12px", border: "none",
              background: loading ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #38bdf8)",
              color: "#fff", fontSize: "15px", fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: loading ? "none" : "0 6px 20px rgba(37,99,235,0.3)",
              fontFamily: "inherit", transition: "all 0.2s",
              opacity: loading ? 0.75 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 8px 26px rgba(37,99,235,0.4)"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)"; }}
          >
            {loading
              ? <><Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} /> Resetting...</>
              : <><ShieldCheck size={17} /> Reset Password</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}