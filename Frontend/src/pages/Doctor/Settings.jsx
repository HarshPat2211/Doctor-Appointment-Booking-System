import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { User, Mail, Lock, Save, Loader2, ShieldCheck } from "lucide-react";
import API from "../util/api";
import { loginSuccess } from "../../Redux/authSlice";
import { showToast } from "../../Redux/toastSlice";

export default function DoctorSettings() {
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await API.get("/auth/verify");
        setName(data?.name || "");
        setEmail(data?.email || "");
      } catch {
        dispatch(showToast({ message: "Failed to load account settings", type: "error" }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password && password.length < 6) {
      dispatch(showToast({ message: "Password must be at least 6 characters", type: "warning" }));
      return;
    }

    if (password && password !== confirmPassword) {
      dispatch(showToast({ message: "Passwords do not match", type: "warning" }));
      return;
    }

    setSaving(true);
    try {
      const payload = { name, email };
      if (password) payload.password = password;

      const { data } = await API.put("/auth/profile", payload);
      dispatch(loginSuccess(data));
      dispatch(showToast({ message: "Account settings updated", type: "success" }));
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      dispatch(showToast({ message: err?.response?.data?.message || "Update failed", type: "error" }));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px 11px 38px",
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
    gap: "6px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans','Segoe UI',sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2 size={28} style={{ color: "#2563eb", animation: "spin 0.9s linear infinite" }} />
          <p style={{ marginTop: "8px", color: "#2563eb", fontSize: "14px", fontWeight: "500" }}>Loading settings...</p>
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 55%, #e8f4ff 100%)",
        padding: "28px",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ marginBottom: "22px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f" }}>Account Settings</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Update your login details and password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "26px",
              border: "1px solid #dbeafe",
              boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>
                  <User size={11} /> Username
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <User size={15} />
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your username"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  <Mail size={11} /> Email
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  <Lock size={11} /> New Password
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  <Lock size={11} /> Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "11px 18px",
                  borderRadius: "10px",
                  border: "none",
                  background: saving ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #38bdf8)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: saving ? "none" : "0 4px 14px rgba(37,99,235,0.3)",
                }}
              >
                {saving ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Save size={15} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}