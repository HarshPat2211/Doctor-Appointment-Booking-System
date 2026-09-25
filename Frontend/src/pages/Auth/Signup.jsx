import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showToast } from "../../Redux/toastSlice";
import API from "../util/api";
import { loginSuccess } from "../../Redux/authSlice";
import { setPatientData } from "../../Redux/patientSlice";
import Loader from "../../Componet/Loader";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { useSiteName } from "../../utils/siteName";

export default function Signup() {
  const [stage, setStage] = useState("signup");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [age, setAge] = useState("");
  const [ageError, setAgeError] = useState("");
  const [gender, setGender] = useState("");
  const [genderError, setGenderError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const siteName = useSiteName();
  const siteInitial = siteName.trim().charAt(0).toUpperCase() || "H";

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSignup = async () => {
    const trimmedName = name.trim();
    const trimmedAge = age.trim();
    const normalizedGender = gender.trim().toLowerCase();
    const trimmedEmail = email.trim();

    const nameValidation = validateFullName(trimmedName);
    const ageValidation = validateAge(trimmedAge);
    const genderValidation = validateGender(normalizedGender);
    const emailValidation = validateEmail(trimmedEmail);
    const pwdValidation = validatePassword(password);
    const confirmPwdValidation = validateConfirmPassword(confirmPassword, password);

    setNameError(nameValidation);
    setAgeError(ageValidation);
    setGenderError(genderValidation);
    setEmailError(emailValidation);
    setPasswordError(pwdValidation);
    setConfirmPasswordError(confirmPwdValidation);

    if (nameValidation || ageValidation || genderValidation || emailValidation || pwdValidation || confirmPwdValidation) {
      return;
    }

    try {
      setLoading(true);
      await API.post("/auth/register", {
        name: trimmedName,
        age: trimmedAge,
        gender: normalizedGender,
        email: trimmedEmail,
        password,
        role: "patient"
      });
      setStage("verify");
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || "Signup failed", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const validateFullName = (value) => {
    if (!value || !value.trim()) return "Full name is required";
    // no digits allowed
    if (/\d/.test(value)) return "Full name must not contain numbers";
    // at least two words
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return "Please enter at least first name and last name";
    // each word should be at least 2 characters
    if (parts.some(p => p.length < 2)) return "Each name part should be at least 2 characters";
    return "";
  };

  const validateEmail = (value) => {
    if (!value || !value.trim()) return "Email is required";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value)) return "Please enter a valid email address";
    return "";
  };

  const validateAge = (value) => {
    if (!value || !value.trim()) return "Age is required";
    if (!/^\d{1,3}$/.test(value)) return "Age must be entered as a valid number";
    const ageValue = Number(value);
    if (ageValue < 1 || ageValue > 120) return "Age must be between 1 and 120";
    return "";
  };

  const validateGender = (value) => {
    if (!value) return "Gender is required";
    if (!["male", "female", "other"].includes(value)) return "Please select a valid gender";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const validateConfirmPassword = (value, currentPassword) => {
    if (!value) return "Confirm password is required";
    if (value !== currentPassword) return "Passwords do not match";
    return "";
  };

  const handleVerify = async () => {
    if (verificationCode.trim().length !== 4) {
      dispatch(showToast({ message: "Please enter the 4-digit verification code", type: "error" }));
      return;
    }
    try {
      setLoading(true);
      const res = await API.post("/auth/verify-email", { email, code: verificationCode });
      dispatch(loginSuccess(res.data));
      dispatch(setPatientData(res.data));
      dispatch(showToast({ message: "Account created successfully!", type: "success" }));
      navigate("/patient/profile");
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || "Verification failed", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

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

  // ── VERIFY STAGE ──
  if (stage === "verify") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #eff6ff 0%, #ffffff 50%, #e0f2fe 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        position: "relative", overflow: "hidden",
      }}>
        {/* blobs */}
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "#bfdbfe", filter: "blur(90px)", opacity: 0.3, top: -100, right: -80, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "#7dd3fc", filter: "blur(80px)", opacity: 0.2, bottom: -60, left: -60, pointerEvents: "none" }} />

        <div style={{
          width: "100%", maxWidth: "420px",
          background: "#fff", borderRadius: "24px",
          padding: "40px 36px",
          border: "1px solid #dbeafe",
          boxShadow: "0 20px 60px rgba(37,99,235,0.12)",
          position: "relative", zIndex: 1,
        }}>
          {/* Icon */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              border: "2px solid #bfdbfe",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 4px 16px rgba(37,99,235,0.12)",
            }}>
              <ShieldCheck size={26} style={{ color: "#2563eb" }} />
            </div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
              Verify Your Email
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
              We sent a code to <strong style={{ color: "#2563eb" }}>{email}</strong>.<br />Enter it below to activate your account.
            </p>
          </div>

          {/* Code input */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}><ShieldCheck size={11} /> Verification Code</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <ShieldCheck size={15} />
              </span>
              <input
                type="text"
                placeholder="Enter 4-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, "").slice(0,4))}
                disabled={loading}
                style={{
                  ...inputStyle,
                  textAlign: "center",
                  fontSize: "18px",
                  fontWeight: "700",
                  letterSpacing: "0.2em",
                  paddingLeft: "14px",
                }}
                onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
              />
            </div>
          </div>

            <button
            onClick={handleVerify}
            disabled={loading || verificationCode.trim().length !== 4}
            style={{
              width: "100%", padding: "13px",
              borderRadius: "12px", border: "none",
              background: !verificationCode.trim()
                ? "#93c5fd"
                : "linear-gradient(135deg, #2563eb, #38bdf8)",
              color: "#fff", fontSize: "15px", fontWeight: "700",
              cursor: !verificationCode.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: verificationCode.trim() ? "0 6px 20px rgba(37,99,235,0.3)" : "none",
              fontFamily: "inherit",
            }}
          >
              {loading
              ? <><Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} /> Verifying...</>
              : <><ShieldCheck size={17} /> Verify Email</>
            }
          </button>

          <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
            Didn't receive the code?{" "}
            <button
              onClick={() => setStage("signup")}
              style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "600", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}
            >
              Go back
            </button>
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── SIGNUP STAGE ──
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
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* blobs */}
      <div style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "#bfdbfe", filter: "blur(90px)", opacity: 0.3, top: -120, right: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "#7dd3fc", filter: "blur(80px)", opacity: 0.2, bottom: -60, left: -60, pointerEvents: "none" }} />

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
            width: "52px", height: "52px", borderRadius: "14px",
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: "800", fontSize: "22px",
            margin: "0 auto 14px",
            boxShadow: "0 6px 20px rgba(37,99,235,0.3)",
            fontFamily: "'Sora', sans-serif",
          }}>{siteInitial}</div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
            Join {siteName}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Create your patient account to get started
          </p>
        </div>

       
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "22px" }}>

          {/* Full Name */}
          <div>
            <label style={labelStyle}><User size={11} /> Full Name</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <User size={15} />
              </span>
              <input
                type="text" placeholder="Enter your full name"
                value={name} onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
                style={{ ...inputStyle, borderColor: nameError ? "#fca5a5" : inputStyle.border }}
                onFocus={(e) => { if (!nameError) e.target.style.borderColor = "#93c5fd" }}
                onBlur={(e) => { e.target.style.borderColor = nameError ? "#fca5a5" : "#dbeafe"; const v = validateFullName(name); setNameError(v); }}
              />
            </div>
            {nameError && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>{nameError}</p>
            )}
          </div>

          {/* Age */}
          <div>
            <label style={labelStyle}><User size={11} /> Age</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <User size={15} />
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => {
                  const cleanedValue = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                  setAge(cleanedValue);
                  if (ageError) setAgeError("");
                }}
                style={{ ...inputStyle, borderColor: ageError ? "#fca5a5" : inputStyle.border }}
                onFocus={(e) => { if (!ageError) e.target.style.borderColor = "#93c5fd"; }}
                onBlur={(e) => {
                  e.target.style.borderColor = ageError ? "#fca5a5" : "#dbeafe";
                  const v = validateAge(age);
                  setAgeError(v);
                }}
              />
            </div>
            {ageError && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>{ageError}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label style={labelStyle}><User size={11} /> Gender</label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "8px"
            }}>
              {[
                { label: "Male", value: "male" },
                { label: "Female", value: "female" },
                { label: "Other", value: "other" }
              ].map((option) => (
                <label
                  key={option.value}
                  style={{
                    border: `1px solid ${
                      gender === option.value
                        ? "#60a5fa"
                        : genderError
                          ? "#fca5a5"
                          : "#dbeafe"
                    }`,
                    borderRadius: "10px",
                    padding: "10px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: gender === option.value ? "#eff6ff" : "#f8faff",
                    color: "#1e3a5f",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={gender === option.value}
                    onChange={(e) => {
                      setGender(e.target.value);
                      if (genderError) setGenderError("");
                    }}
                    style={{ accentColor: "#2563eb" }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {genderError && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>{genderError}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}><Mail size={11} /> Email Address</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <Mail size={15} />
              </span>
              <input
                type="email" placeholder="Enter your email"
                value={email} onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                style={{ ...inputStyle, borderColor: emailError ? "#fca5a5" : inputStyle.border }}
                onFocus={(e) => { if (!emailError) e.target.style.borderColor = "#93c5fd" }}
                onBlur={(e) => { e.target.style.borderColor = emailError ? "#fca5a5" : "#dbeafe"; const v = validateEmail(email); setEmailError(v); }}
              />
            </div>
            {emailError && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}><Lock size={11} /> Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password} onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(""); }}
                style={{ ...inputStyle, paddingRight: "42px", borderColor: passwordError ? "#fca5a5" : inputStyle.border }}
                onFocus={(e) => { if (!passwordError) e.target.style.borderColor = "#93c5fd" }}
                onBlur={(e) => { e.target.style.borderColor = passwordError ? "#fca5a5" : "#dbeafe"; const v = validatePassword(password); setPasswordError(v); }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#94a3b8", padding: 0, display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>{passwordError}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label style={labelStyle}><Lock size={11} /> Confirm Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                <Lock size={15} />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError("");
                }}
                style={{
                  ...inputStyle,
                  paddingRight: "42px",
                  borderColor: confirmPasswordError ? "#fca5a5" : "#dbeafe",
                  background: confirmPasswordError ? "#fff5f5" : "#f8faff",
                }}
                onFocus={(e) => {
                  if (!confirmPasswordError)
                    e.target.style.borderColor = "#93c5fd";
                }}
                onBlur={(e) => {
                  const v = validateConfirmPassword(confirmPassword, password);
                  setConfirmPasswordError(v);
                  e.target.style.borderColor = v ? "#fca5a5" : "#dbeafe";
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#94a3b8", padding: 0, display: "flex", alignItems: "center",
                }}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPasswordError && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>
                {confirmPasswordError}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSignup}
          disabled={loading}
          style={{
            width: "100%", padding: "13px",
            borderRadius: "12px", border: "none",
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            color: "#fff", fontSize: "15px", fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            boxShadow: "0 6px 20px rgba(37,99,235,0.3)",
            fontFamily: "inherit", transition: "all 0.2s",
            opacity: loading ? 0.75 : 1,
          }}
        >
          {loading
            ? <><Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} /> Creating Account...</>
            : <>Create Account <ArrowRight size={17} /></>
          }
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
        </div>

        {/* Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Forgot your password?{" "}
            <Link to="/forgot-password" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none" }}>
              Reset here
            </Link>
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Are you a doctor?{" "}
            <Link to="/doctor-registration/step1" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none" }}>
              Become a Doctor →
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