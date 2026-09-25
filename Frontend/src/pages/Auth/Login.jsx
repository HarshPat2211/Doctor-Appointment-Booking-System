import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import API from "../util/api";
import { loginSuccess } from "../../Redux/authSlice";
import { setDoctorProfile } from "../../Redux/doctorSlice";
import { setPatientData } from "../../Redux/patientSlice";
import { showToast } from "../../Redux/toastSlice";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useSiteName } from "../../utils/siteName";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const siteName = useSiteName();
  const siteInitial = siteName.trim().charAt(0).toUpperCase() || "H";

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async () => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    if (!cleanEmail || !cleanPassword) {
      dispatch(showToast({ message: "Please enter both email and password", type: "warning" }));
      return;
    }
    try {
      setLoading(true);
      const { data } = await API.post("/auth/login", { email: cleanEmail, password: cleanPassword });

      if (data.mustResetPassword) {
        dispatch(showToast({ message: "Please reset your password to continue", type: "warning" }));
        navigate("/reset-password", { state: { email: cleanEmail } });
        return;
      }

      dispatch(loginSuccess(data));
      dispatch(showToast({ message: "Login successful! Redirecting...", type: "success" }));

      if (data.role === "doctor") {
        dispatch(setDoctorProfile(data));
        navigate(data.isFirstLogin ? "/doctor/profile" : "/doctor");
      } else if (data.role === "patient") {
        dispatch(setPatientData(data));
        navigate("/patient/browse-services");
      } else if (data.role === "admin") {
        navigate("/admin");
      }
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Invalid email or password", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
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

      {/* Decorative blobs */}
      <div style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "#bfdbfe", filter: "blur(90px)", opacity: 0.28, top: -120, right: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "#7dd3fc", filter: "blur(80px)", opacity: 0.2, bottom: -60, left: -60, pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "420px",
        background: "#fff", borderRadius: "24px",
        padding: "40px 36px",
        border: "1px solid #dbeafe",
        boxShadow: "0 20px 60px rgba(37,99,235,0.12)",
        position: "relative", zIndex: 1,
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: "800", fontSize: "22px",
            margin: "0 auto 14px",
            boxShadow: "0 6px 20px rgba(37,99,235,0.3)",
            fontFamily: "'Sora', sans-serif",
          }}>{siteInitial}</div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
            Welcome Back
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Sign in to your {siteName} account
          </p>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "12px" }}>

          {/* Email */}
          <div>
            <label style={labelStyle}><Mail size={11} /> Email Address</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <Mail size={15} />
              </span>
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}><Lock size={11} /> Password</label>
              <Link
                to="/forgot-password"
                style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", textDecoration: "none" }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyle, paddingRight: "42px" }}
                onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#94a3b8", padding: 0,
                  display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleLogin}
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
            marginTop: "20px",
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 8px 26px rgba(37,99,235,0.4)"; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)"; }}
        >
          {loading
            ? <><Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} /> Signing in...</>
            : <>Sign In <ArrowRight size={17} /></>
          }
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "22px 0 18px" }}>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
        </div>

        {/* Footer links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none" }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              Sign up
            </Link>
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            <Link to="/" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}