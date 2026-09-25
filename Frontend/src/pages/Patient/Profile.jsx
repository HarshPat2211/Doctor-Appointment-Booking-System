import React, { useEffect, useState, useRef } from "react";
import API from "../util/api";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../Redux/authSlice";
import { showToast } from "../../Redux/toastSlice";
import { User, Mail, Lock, Droplets, AlertCircle, Heart, Pill, Loader2, Save, ChevronDown, Check, Phone, MapPin, Venus } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function PatientProfile() {
  const dispatch = useDispatch();
  const auth = JSON.parse(localStorage.getItem("auth")) || {};
  const user = auth.user || {};

  const pickNonEmpty = (...values) => {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      if (typeof value === "string") {
        if (value.trim() === "") continue;
        return value;
      }
      return value;
    }
    return "";
  };

  const normalizeMedicalHistory = (history) => ({
    bloodGroup: history?.bloodGroup ?? "",
    allergies: history?.allergies ?? "",
    chronicDiseases: history?.chronicDiseases ?? "",
    pastSurgeries: history?.pastSurgeries ?? "",
    currentMedications: history?.currentMedications ?? "",
  });

  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [age, setAge] = useState(user.age || "");
  const [gender, setGender] = useState(user.gender || "");
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber || "");
  const [residentialAddress, setResidentialAddress] = useState(user.residentialAddress || "");
  const [password, setPassword] = useState("");
  const [medicalHistory, setMedicalHistory] = useState(normalizeMedicalHistory(user.medicalHistory));
  const [loading, setLoading] = useState(false);
  const [bgDropdownOpen, setBgDropdownOpen] = useState(false);
  const bgDropdownRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/auth/verify");
        setName(pickNonEmpty(data.name, user.name));
        setEmail(pickNonEmpty(data.email, user.email));
        setAge(pickNonEmpty(data.age, user.age));
        setGender(pickNonEmpty(data.gender, user.gender));
        setMobileNumber(pickNonEmpty(data.mobileNumber, user.mobileNumber));
        setResidentialAddress(pickNonEmpty(data.residentialAddress, user.residentialAddress));
        setMedicalHistory(normalizeMedicalHistory(data.medicalHistory ?? user.medicalHistory));
      } catch {
        // ignore
      }
    };
    fetchProfile();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (bgDropdownRef.current && !bgDropdownRef.current.contains(e.target)) {
        setBgDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanAge = String(age || "").trim();
    const cleanGender = String(gender || "").trim().toLowerCase();
    const cleanMobile = String(mobileNumber || "").trim();
    const cleanAddress = String(residentialAddress || "").trim();

    if (!cleanName) {
      dispatch(showToast({ message: "Full name is required", type: "error" }));
      return;
    }

    if (!/^\d{1,3}$/.test(cleanAge) || Number(cleanAge) < 1 || Number(cleanAge) > 120) {
      dispatch(showToast({ message: "Please enter a valid age between 1 and 120", type: "error" }));
      return;
    }

    if (!["male", "female", "other"].includes(cleanGender)) {
      dispatch(showToast({ message: "Please select gender", type: "error" }));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: cleanName,
        age: cleanAge,
        gender: cleanGender,
        mobileNumber: cleanMobile,
        residentialAddress: cleanAddress,
        medicalHistory,
      };
      if (password) payload.password = password;
      const { data } = await API.put("/auth/profile", payload);
      dispatch(loginSuccess(data));
      dispatch(showToast({ message: "Profile updated", type: "success" }));
      setPassword("");
    } catch (err) {
      dispatch(showToast({ message: err?.response?.data?.message || "Update failed", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryChange = (e) => {
    setMedicalHistory({ ...medicalHistory, [e.target.name]: e.target.value });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
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

  const sectionIconStyle = {
    width: "30px", height: "30px", borderRadius: "8px",
    background: "#eff6ff", border: "1px solid #bfdbfe",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#2563eb",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 55%, #e8f4ff 100%)",
        padding: "28px",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            }}
          >
            <User size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f" }}>Your Profile</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Update your personal details and medical history (email cannot be changed)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── PERSONAL INFO CARD ── */}
          <div
            style={{
              background: "#fff", borderRadius: "18px",
              padding: "26px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <div style={sectionIconStyle}><User size={14} /></div>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>Personal Information</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Name */}
              <div>
                <label style={labelStyle}><User size={11} /> Full Name</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <User size={15} />
                  </span>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)} required
                    placeholder="Enter your full name"
                    style={{ ...inputStyle, paddingLeft: "38px" }}
                    onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                    onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                  />
                </div>
              </div>

              {/* Age */}
              <div>
                <label style={labelStyle}><User size={11} /> Age</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <User size={15} />
                  </span>
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                    required
                    placeholder="Enter your age"
                    inputMode="numeric"
                    style={{ ...inputStyle, paddingLeft: "38px" }}
                    onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                    onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label style={labelStyle}><Venus size={11} /> Gender</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                  {[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Other", value: "other" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        border: `1px solid ${gender === option.value ? "#60a5fa" : "#dbeafe"}`,
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
                        fontWeight: "600",
                      }}
                    >
                      <input
                        type="radio"
                        name="patientGender"
                        value={option.value}
                        checked={gender === option.value}
                        onChange={(e) => setGender(e.target.value)}
                        style={{ accentColor: "#2563eb" }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label style={labelStyle}><Phone size={11} /> Mobile Number</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <Phone size={15} />
                  </span>
                  <input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    style={{ ...inputStyle, paddingLeft: "38px" }}
                    onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                    onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                  />
                </div>
              </div>

              {/* Residential Address */}
              <div>
                <label style={labelStyle}><MapPin size={11} /> Residential Address</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "14px", color: "#60a5fa", pointerEvents: "none" }}>
                    <MapPin size={15} />
                  </span>
                  <textarea
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    rows={3}
                    placeholder="Enter your full residential address"
                    style={{ ...inputStyle, paddingLeft: "38px", paddingTop: "10px", resize: "none", lineHeight: "1.6" }}
                    onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                    onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}><Mail size={11} /> Email Address</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <Mail size={15} />
                  </span>
                  <input
                    value={email}
                    type="email"
                    disabled
                    readOnly
                    placeholder="Email cannot be changed"
                    style={{
                      ...inputStyle,
                      paddingLeft: "38px",
                      background: "#f1f5f9",
                      color: "#64748b",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}><Lock size={11} /> New Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <Lock size={15} />
                  </span>
                  <input
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    type="password" placeholder="Leave blank to keep current password"
                    style={{ ...inputStyle, paddingLeft: "38px" }}
                    onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                    onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── MEDICAL HISTORY CARD ── */}
          <div
            style={{
              background: "#fff", borderRadius: "18px",
              padding: "26px", border: "1px solid #dbeafe",
              boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <div style={sectionIconStyle}><Heart size={14} /></div>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>Medical History</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

              {/* ── BLOOD GROUP CUSTOM DROPDOWN ── */}
              <div ref={bgDropdownRef} style={{ position: "relative" }}>
                <label style={labelStyle}><Droplets size={11} /> Blood Group</label>

                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setBgDropdownOpen(!bgDropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: bgDropdownOpen ? "1px solid #93c5fd" : "1px solid #dbeafe",
                    background: bgDropdownOpen ? "#eff6ff" : "#f8faff",
                    fontSize: "14px",
                    color: medicalHistory.bloodGroup ? "#1e3a5f" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: medicalHistory.bloodGroup ? "600" : "400",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Droplets size={15} style={{ color: "#60a5fa", flexShrink: 0 }} />
                    {medicalHistory.bloodGroup || "Select blood group..."}
                  </div>
                  <ChevronDown
                    size={15}
                    style={{
                      color: "#94a3b8",
                      transform: bgDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      flexShrink: 0,
                    }}
                  />
                </button>

                {/* Dropdown panel */}
                {bgDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      width: "100%",
                      background: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #dbeafe",
                      boxShadow: "0 12px 32px rgba(37,99,235,0.13)",
                      zIndex: 100,
                      overflow: "hidden",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: "10px",
                        fontWeight: "700",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid #f1f5f9",
                        background: "#fafcff",
                      }}
                    >
                      Blood Group
                    </div>

                    {/* Grid of options */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px",
                        padding: "8px",
                      }}
                    >
                      {BLOOD_GROUPS.map((bg) => {
                        const isSelected = medicalHistory.bloodGroup === bg;
                        return (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => {
                              setMedicalHistory({ ...medicalHistory, bloodGroup: bg });
                              setBgDropdownOpen(false);
                            }}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                              background: isSelected
                                ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
                                : "transparent",
                              color: isSelected ? "#2563eb" : "#334155",
                              fontSize: "14px",
                              fontWeight: isSelected ? "700" : "500",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.12s",
                              fontFamily: "inherit",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "#f0f7ff";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {bg}
                            {isSelected && <Check size={13} style={{ color: "#2563eb" }} />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Clear option */}
                    {medicalHistory.bloodGroup && (
                      <div style={{ borderTop: "1px solid #f1f5f9", padding: "6px 8px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setMedicalHistory({ ...medicalHistory, bloodGroup: "" });
                            setBgDropdownOpen(false);
                          }}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "8px",
                            border: "none", background: "transparent",
                            color: "#94a3b8", fontSize: "12px", cursor: "pointer",
                            fontFamily: "inherit", transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Allergies */}
              <div>
                <label style={labelStyle}><AlertCircle size={11} /> Allergies</label>
                <input
                  name="allergies" value={medicalHistory.allergies}
                  onChange={handleHistoryChange}
                  placeholder="e.g. Peanuts, Penicillin"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>

              {/* Chronic Diseases */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}><Heart size={11} /> Chronic Diseases</label>
                <input
                  name="chronicDiseases" value={medicalHistory.chronicDiseases}
                  onChange={handleHistoryChange}
                  placeholder="e.g. Diabetes, Hypertension"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>

              {/* Past Surgeries */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Past Surgeries</label>
                <input
                  name="pastSurgeries" value={medicalHistory.pastSurgeries}
                  onChange={handleHistoryChange}
                  placeholder="e.g. Appendectomy 2018"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>

              {/* Current Medications */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}><Pill size={11} /> Current Medications</label>
                <textarea
                  name="currentMedications" value={medicalHistory.currentMedications}
                  onChange={handleHistoryChange}
                  rows={3} placeholder="List current medications..."
                  style={{ ...inputStyle, resize: "none", lineHeight: "1.6" }}
                  onFocus={(e) => e.target.style.borderColor = "#93c5fd"}
                  onBlur={(e) => e.target.style.borderColor = "#dbeafe"}
                />
              </div>
            </div>
          </div>

          {/* ── SAVE BUTTON ── */}
          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px", border: "none",
              background: loading ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #38bdf8)",
              color: "#fff", fontSize: "15px", fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: loading ? "none" : "0 6px 20px rgba(37,99,235,0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> Saving...</>
              : <><Save size={18} /> Save Changes</>
            }
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
}