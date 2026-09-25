import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showToast } from "../../Redux/toastSlice";
import API from "../util/api";
import { User, Mail, Phone, MapPin, Hash, ArrowRight, Loader2, Stethoscope } from "lucide-react";

export default function DoctorRegistrationStep1() {
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    email: "",
    mobileNumber: "",
    residentialAddress: "",
  });
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.age || !formData.email || !formData.mobileNumber || !formData.residentialAddress) {
      dispatch(showToast({ message: "Please fill all fields", type: "error" })); return;
    }
    if (isNaN(formData.age) || formData.age < 18 || formData.age > 100) {
      dispatch(showToast({ message: "Please enter a valid age (18-100)", type: "error" })); return;
    }
    setLoading(true);
    try {
      await API.post("/doctor-registration/step1", formData);
      dispatch(showToast({ message: "Basic details saved successfully", type: "success" }));
      navigate("/doctor-registration/step2", { state: { email: formData.email } });
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || "Failed to save basic details", type: "error" }));
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

  const fields = [
    { label: "Full Name", name: "fullName", type: "text", placeholder: "Dr. John Doe", icon: <User size={15} /> },
    { label: "Age", name: "age", type: "number", placeholder: "30", icon: <Hash size={15} />, extra: { min: 18, max: 100 } },
    { label: "Email Address", name: "email", type: "email", placeholder: "doctor@example.com", icon: <Mail size={15} /> },
    { label: "Mobile Number", name: "mobileNumber", type: "tel", placeholder: "+91 98765 43210", icon: <Phone size={15} /> },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #eff6ff 0%, #ffffff 50%, #e0f2fe 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 24px",
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
        width: "100%", maxWidth: "520px",
        background: "#fff", borderRadius: "24px",
        padding: "40px 36px",
        border: "1px solid #dbeafe",
        boxShadow: "0 20px 60px rgba(37,99,235,0.12)",
        position: "relative", zIndex: 1,
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "54px", height: "54px", borderRadius: "14px",
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 6px 20px rgba(37,99,235,0.3)",
            color: "#fff",
          }}>
            <Stethoscope size={26} />
          </div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
            Doctor Registration
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Step 1 of 2 — Basic Details
          </p>

          {/* Progress bar */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              {["Basic Details", "Professional Info"].map((s, i) => (
                <span key={i} style={{
                  fontSize: "11px", fontWeight: "700",
                  color: i === 0 ? "#2563eb" : "#94a3b8",
                  letterSpacing: "0.04em",
                }}>{s}</span>
              ))}
            </div>
            <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{
                width: "50%", height: "100%",
                background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                borderRadius: "10px",
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: "600" }}>● In Progress</span>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>○ Upcoming</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>

            {/* Regular input fields */}
            {fields.map((f) => (
              <div key={f.name}>
                <label style={labelStyle}>
                  {React.cloneElement(f.icon, { size: 11 })} {f.label}
                  <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    {f.icon}
                  </span>
                  <input
                    type={f.type}
                    name={f.name}
                    value={formData[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    required
                    {...(f.extra || {})}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                    onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                  />
                </div>
              </div>
            ))}

            {/* Residential Address — textarea */}
            <div>
              <label style={labelStyle}>
                <MapPin size={11} /> Residential Address
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "14px", color: "#60a5fa", pointerEvents: "none" }}>
                  <MapPin size={15} />
                </span>
                <textarea
                  name="residentialAddress"
                  value={formData.residentialAddress}
                  onChange={handleChange}
                  placeholder="123 Main Street, City, State, ZIP Code"
                  rows={3}
                  required
                  style={{
                    ...inputStyle,
                    paddingTop: "12px",
                    paddingLeft: "40px",
                    resize: "none",
                    lineHeight: "1.6",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <Link
              to="/signup"
              style={{
                flex: 1, padding: "13px",
                borderRadius: "12px",
                border: "1px solid #dbeafe",
                background: "#f8faff",
                color: "#64748b",
                fontSize: "14px", fontWeight: "600",
                textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#93c5fd"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#dbeafe"; }}
            >
              ← Back
            </Link>

            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: "13px",
                borderRadius: "12px", border: "none",
                background: loading ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #38bdf8)",
                color: "#fff", fontSize: "14px", fontWeight: "700",
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
                ? <><Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} /> Saving...</>
                : <>Continue to Step 2 <ArrowRight size={17} /></>
              }
            </button>
          </div>

          {/* Sign in link */}
          <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none" }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}