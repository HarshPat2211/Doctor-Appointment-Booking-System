import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showToast } from "../../Redux/toastSlice";
import API from "../util/api";
import {
  GraduationCap, Stethoscope, Hash, Clock,
  Building2, MapPin, IndianRupee, ChevronDown,
  Check, ArrowRight, Loader2,
} from "lucide-react";

/* ── Reusable custom dropdown ── */
function CustomDropdown({ label, icon, options, value, onChange, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const labelStyle = {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", fontWeight: "700", color: "#64748b",
    marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={labelStyle}>
        {React.cloneElement(icon, { size: 11 })} {label}
        {required && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "11px 14px",
          borderRadius: "10px",
          border: open ? "1px solid #93c5fd" : "1px solid #dbeafe",
          background: open ? "#eff6ff" : "#f8faff",
          fontSize: "14px",
          color: value ? "#1e3a5f" : "#94a3b8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", fontFamily: "inherit",
          fontWeight: value ? "600" : "400",
          transition: "all 0.15s",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {React.cloneElement(icon, { size: 15, style: { color: "#60a5fa", flexShrink: 0 } })}
          {value || placeholder}
        </div>
        <ChevronDown size={15} style={{ color: "#94a3b8", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          width: "100%", background: "#fff",
          borderRadius: "12px", border: "1px solid #dbeafe",
          boxShadow: "0 12px 32px rgba(37,99,235,0.13)",
          zIndex: 100, overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #f1f5f9", background: "#fafcff" }}>
            {label}
          </div>
          {options.map((opt) => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  width: "100%", padding: "11px 14px",
                  border: "none", borderBottom: "1px solid #f8faff",
                  background: isSelected ? "#eff6ff" : "transparent",
                  color: isSelected ? "#2563eb" : "#334155",
                  fontSize: "13px", fontWeight: isSelected ? "700" : "400",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontFamily: "inherit", transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f0f7ff"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {opt}
                {isSelected && <Check size={14} style={{ color: "#2563eb", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
const QUALIFICATIONS = ["MBBS", "BDS", "MD", "MS", "Other"];
const SPECIALIZATIONS = ["Cardiologists", "Pediatricians", "Neurologists", "Dermatologists", "Dentists", "General Physicians"];

export default function DoctorRegistrationStep2() {
  const location = useLocation();
  const email = location.state?.email || "";

  const [formData, setFormData] = useState({
    email,
    medicalQualification: "",
    specialization: "",
    medicalRegistrationId: "",
    yearsOfExperience: "",
    hospitalClinicName: "",
    hospitalClinicAddress: "",
    fees: "",
  });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      dispatch(showToast({ message: "Please complete step 1 first", type: "error" }));
      navigate("/doctor-registration/step1");
    }
  }, [email]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const setField = (name) => (val) => setFormData((p) => ({ ...p, [name]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { medicalQualification, specialization, medicalRegistrationId, yearsOfExperience, hospitalClinicName, hospitalClinicAddress, fees } = formData;
    if (!medicalQualification || !specialization || !medicalRegistrationId || !yearsOfExperience || !hospitalClinicName || !hospitalClinicAddress || !fees) {
      dispatch(showToast({ message: "Please fill all fields", type: "error" })); return;
    }
    if (isNaN(yearsOfExperience) || yearsOfExperience < 0) {
      dispatch(showToast({ message: "Please enter valid years of experience", type: "error" })); return;
    }
    if (isNaN(fees) || fees < 0) {
      dispatch(showToast({ message: "Please enter valid consultation fees", type: "error" })); return;
    }
    setLoading(true);
    try {
      await API.post("/doctor-registration/step2", { ...formData, yearsOfExperience: Number(yearsOfExperience), fees: Number(fees) });
      dispatch(showToast({ message: "Request sent to admin. Please wait for approval.", type: "success" }));
      navigate("/doctor-registration/confirmation", { state: { email: formData.email } });
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || "Failed to submit request", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px 11px 40px",
    borderRadius: "10px", border: "1px solid #dbeafe",
    background: "#f8faff", fontSize: "14px", color: "#1e3a5f",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", fontWeight: "700", color: "#64748b",
    marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em",
  };

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
        width: "100%", maxWidth: "540px",
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
            boxShadow: "0 6px 20px rgba(37,99,235,0.3)", color: "#fff",
          }}>
            <Stethoscope size={26} />
          </div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', sans-serif" }}>
            Doctor Registration
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Step 2 of 2 — Professional Details
          </p>

          {/* Progress bar */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              {["Basic Details", "Professional Info"].map((s, i) => (
                <span key={i} style={{ fontSize: "11px", fontWeight: "700", color: i === 1 ? "#2563eb" : "#059669", letterSpacing: "0.04em" }}>
                  {i === 0 ? "✓ " : ""}{s}
                </span>
              ))}
            </div>
            <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #2563eb, #38bdf8)", borderRadius: "10px", transition: "width 0.4s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span style={{ fontSize: "10px", color: "#059669", fontWeight: "600" }}>✓ Completed</span>
              <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: "600" }}>● In Progress</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>

            {/* ── Qualification dropdown ── */}
            <CustomDropdown
              label="Medical Qualification"
              icon={<GraduationCap />}
              options={QUALIFICATIONS}
              value={formData.medicalQualification}
              onChange={setField("medicalQualification")}
              placeholder="Select qualification..."
              required
            />

            {/* ── Specialization dropdown ── */}
            <CustomDropdown
              label="Specialization"
              icon={<Stethoscope />}
              options={SPECIALIZATIONS}
              value={formData.specialization}
              onChange={setField("specialization")}
              placeholder="Select specialization..."
              required
            />

            {/* Medical Registration ID */}
            <div>
              <label style={labelStyle}>
                <Hash size={11} /> Medical Registration / Doctor ID
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}><Hash size={15} /></span>
                <input type="text" name="medicalRegistrationId" value={formData.medicalRegistrationId} onChange={handleChange} placeholder="REG123456" required
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>
            </div>

            {/* Years of Experience */}
            <div>
              <label style={labelStyle}>
                <Clock size={11} /> Years of Experience
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}><Clock size={15} /></span>
                <input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} placeholder="5" min="0" required
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>
            </div>

            {/* Hospital / Clinic Name */}
            <div>
              <label style={labelStyle}>
                <Building2 size={11} /> Hospital / Clinic Name
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}><Building2 size={15} /></span>
                <input type="text" name="hospitalClinicName" value={formData.hospitalClinicName} onChange={handleChange} placeholder="City General Hospital" required
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>
            </div>

            {/* Hospital / Clinic Address */}
            <div>
              <label style={labelStyle}>
                <MapPin size={11} /> Hospital / Clinic Address
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "14px", color: "#60a5fa", pointerEvents: "none" }}><MapPin size={15} /></span>
                <textarea name="hospitalClinicAddress" value={formData.hospitalClinicAddress} onChange={handleChange} placeholder="456 Medical Center Drive, City, State, ZIP" rows={3} required
                  style={{ ...inputStyle, paddingTop: "12px", paddingLeft: "40px", resize: "none", lineHeight: "1.6" }}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>
            </div>

            {/* Consultation Fees */}
            <div>
              <label style={labelStyle}>
                <IndianRupee size={11} /> Consultation Fees (₹)
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}><IndianRupee size={15} /></span>
                <input type="number" name="fees" value={formData.fees} onChange={handleChange} placeholder="500" min="0" step="1" required
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={() => navigate("/doctor-registration/step1")}
              style={{
                flex: 1, padding: "13px", borderRadius: "12px",
                border: "1px solid #dbeafe", background: "#f8faff",
                color: "#64748b", fontSize: "14px", fontWeight: "600",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#93c5fd"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#dbeafe"; }}
            >
              ← Back
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: "13px", borderRadius: "12px", border: "none",
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
                ? <><Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} /> Submitting...</>
                : <>Request to Join <ArrowRight size={17} /></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}