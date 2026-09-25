import React, { useEffect, useState, useMemo, useRef } from "react";
import { Search, ChevronDown, Check, Stethoscope, Clock, IndianRupee, UserRound, Heart } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showToast } from "../../Redux/toastSlice";
import { getCurrentUser } from "../../utils/authHelpers";
import DoctorAvatar from "../../Componet/DoctorAvatar";
import PublicHeader from "../../Componet/PublicHeader";
import PublicFooter from "../../Componet/PublicFooter";
import AISymptomTriage from "../../Componet/AISymptomTriage";

export default function BrowseDoctors() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);

  const [page, setPage] = useState(1);
  const [allDoctors, setAllDoctors] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filters, setFilters] = useState({
    specialty: "All Specialties",
    search: "",
  });

  const specializations = [
    "All Specialties",
    "General Physicians",
    "Dentists",
    "Dermatologists",
    "Neurologists",
    "Pediatricians",
    "Cardiologists",
  ];

  const auth = useMemo(() => {
    try {
      const raw = localStorage.getItem("auth");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const token = auth?.token;

  const api = useMemo(() => axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }), [token]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get("/doctors");
        setAllDoctors(res.data);
      } catch (err) {
        console.log("Error loading doctors", err);
      }
    };
    fetchDoctors();
  }, [api]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const checkAvailability = (availability) => {
    if (!availability) return false;
    return Object.values(availability).some(
      (day) => Array.isArray(day) && day.length > 0
    );
  };

  const filteredDoctors = allDoctors.filter((doc) => {
    const doctorName = doc.user?.name?.toLowerCase() || "";
    const specialization = doc.specialization?.toLowerCase() || "";
    const searchText = filters.search.toLowerCase();
    return (
      (doctorName.includes(searchText) || specialization.includes(searchText)) &&
      (filters.specialty === "All Specialties" ||
        specialization === filters.specialty.toLowerCase())
    );
  });

  const doctorsToShow = filteredDoctors.slice(0, page * 6);
  const currentUser = getCurrentUser();
  const isLoggedIn = Boolean(currentUser);
  const savedKey = currentUser?._id ? `savedDoctors:${currentUser._id}` : "savedDoctors:guest";

  const readSavedDoctors = () => {
    try {
      const raw = localStorage.getItem(savedKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [savedDoctors, setSavedDoctors] = useState(() => readSavedDoctors());
  const savedIds = useMemo(() => new Set(savedDoctors.map((doc) => doc._id)), [savedDoctors]);

  useEffect(() => {
    setSavedDoctors(readSavedDoctors());
  }, [savedKey]);

  const handleBookNow = (doctorId) => {
    if (!currentUser) {
      dispatch(showToast({ message: "Please sign in as patient to book an appointment", type: "warning" }));
      navigate("/login");
      return;
    }
    if (currentUser.role !== "patient") {
      dispatch(showToast({ message: "Only patients can book appointments", type: "warning" }));
      return;
    }
    navigate(`/patient/calendar/${doctorId}`);
  };

  const handleToggleSave = (doc) => {
    if (!currentUser) {
      dispatch(showToast({ message: "Please sign in as patient to save doctors", type: "warning" }));
      navigate("/login");
      return;
    }
    if (currentUser.role !== "patient") {
      dispatch(showToast({ message: "Only patients can save doctors", type: "warning" }));
      return;
    }

    const doctorData = {
      _id: doc._id,
      name: doc.user?.name || "Doctor",
      specialty: doc.specialization || "Specialist",
      image: doc.profileImage || doc.user?.profileImage || "",
    };

    setSavedDoctors((prev) => {
      const exists = prev.some((item) => item._id === doctorData._id);
      const updated = exists ? prev.filter((item) => item._id !== doctorData._id) : [doctorData, ...prev];
      localStorage.setItem(savedKey, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 55%, #e8f4ff 100%)",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      {!isLoggedIn && <PublicHeader sticky />}

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px" }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#1e3a5f" }}>
            Find Doctors
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
            Book appointments with trusted healthcare professionals
          </p>
        </div>

        {/* 🧠 AI Symptom Triage + Smart Doctor Matching */}
        <AISymptomTriage
          onSelectSpecialty={(specialty) => {
            if (specialty) {
              setFilters((prev) => ({ ...prev, specialty }));
            }
          }}
        />

        {/* ── FILTER BAR ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px 24px",
            border: "1px solid #dbeafe",
            boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>

            {/* Search */}
            <div
              style={{
                flex: 1,
                minWidth: "200px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "1px solid #dbeafe",
                borderRadius: "12px",
                padding: "10px 14px",
                background: "#f8faff",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#93c5fd"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#dbeafe"}
            >
              <Search size={16} style={{ color: "#60a5fa", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by name or specialty..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{
                  border: "none", outline: "none",
                  background: "transparent", width: "100%",
                  fontSize: "14px", color: "#1e3a5f",
                }}
              />
            </div>

            {/* Custom Dropdown */}
            <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: dropdownOpen ? "1px solid #93c5fd" : "1px solid #dbeafe",
                  background: dropdownOpen ? "#eff6ff" : "#f8faff",
                  color: "#1e3a5f",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  minWidth: "200px",
                  justifyContent: "space-between",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Stethoscope size={15} style={{ color: "#2563eb" }} />
                  <span>{filters.specialty}</span>
                </div>
                <ChevronDown
                  size={15}
                  style={{
                    color: "#94a3b8",
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    width: "100%",
                    background: "#fff",
                    borderRadius: "14px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 12px 36px rgba(37,99,235,0.13)",
                    zIndex: 100,
                    overflow: "hidden",
                    minWidth: "220px",
                  }}
                >
                  {/* Dropdown header */}
                  <div
                    style={{
                      padding: "10px 14px",
                      fontSize: "10px",
                      fontWeight: "700",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      borderBottom: "1px solid #f1f5f9",
                      background: "#fafcff",
                    }}
                  >
                    Specialization
                  </div>

                  {specializations.map((spec) => {
                    const isSelected = filters.specialty === spec;
                    return (
                      <button
                        key={spec}
                        onClick={() => {
                          setFilters({ ...filters, specialty: spec });
                          setDropdownOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "11px 14px",
                          border: "none",
                          background: isSelected ? "#eff6ff" : "transparent",
                          color: isSelected ? "#2563eb" : "#334155",
                          fontSize: "13px",
                          fontWeight: isSelected ? "600" : "400",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.12s",
                          borderBottom: "1px solid #f8faff",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "#f0f7ff";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {spec}
                        {isSelected && (
                          <Check size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Result count */}
          <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
            <span style={{ color: "#2563eb", fontWeight: "700" }}>{filteredDoctors.length}</span>{" "}
            doctor{filteredDoctors.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* ── DOCTOR CARDS GRID ── */}
        {filteredDoctors.length === 0 ? (
          <div
            style={{
              textAlign: "center", padding: "64px 24px",
              background: "#fff", borderRadius: "16px",
              border: "1px solid #dbeafe",
            }}
          >
            <UserRound size={36} style={{ color: "#bfdbfe", margin: "0 auto 12px" }} />
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>No doctors found matching your search.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {doctorsToShow.map((doc) => {
              const isAvailable = checkAvailability(doc.availability);

              return (
                <div
                  key={doc._id}
                  style={{
                    background: "#fff",
                    borderRadius: "18px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
                    overflow: "hidden",
                    transition: "box-shadow 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,0.15)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 16px rgba(37,99,235,0.07)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {/* Card banner */}
                  <div
                    style={{
                      height: "100px",
                      background: "linear-gradient(135deg, #1d4ed8, #38bdf8)",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      paddingBottom: "0",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "absolute", bottom: "-28px" }}>
                      <DoctorAvatar
                        doctor={doc}
                        size="w-16 h-16"
                        textClass="text-xl"
                        borderClass="border-4 border-white"
                      />
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "38px 20px 20px", textAlign: "center" }}>
                    <h3 style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: "700", color: "#1e3a5f" }}>
                      {doc.user?.name}
                    </h3>
                    <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#2563eb", fontWeight: "500" }}>
                      {doc.specialization}
                    </p>

                    {/* Stats row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "0",
                        borderRadius: "12px",
                        border: "1px solid #dbeafe",
                        overflow: "hidden",
                        marginBottom: "14px",
                      }}
                    >
                      {[
                        { icon: <Clock size={13} />, label: "Exp", value: `${doc.experience} yrs` },
                        { icon: <IndianRupee size={13} />, label: "Fee", value: `₹${doc.fees}` },
                      ].map((stat, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            textAlign: "center",
                            borderRight: i === 0 ? "1px solid #dbeafe" : "none",
                            background: "#fafcff",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "#2563eb", marginBottom: "2px" }}>
                            {stat.icon}
                          </div>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>{stat.value}</p>
                          <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Availability badge */}
                    <div style={{ marginBottom: "14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: isAvailable ? "#ecfdf5" : "#fef2f2",
                          color: isAvailable ? "#059669" : "#dc2626",
                          border: `1px solid ${isAvailable ? "#a7f3d0" : "#fecaca"}`,
                        }}
                      >
                        <span
                          style={{
                            width: "6px", height: "6px", borderRadius: "50%",
                            background: isAvailable ? "#22c55e" : "#ef4444",
                            flexShrink: 0,
                          }}
                        />
                        {isAvailable ? "Available" : "Not Available"}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleToggleSave(doc)}
                        title={savedIds.has(doc._id) ? "Unsave" : "Save"}
                        style={{
                          width: "38px", padding: "10px 0",
                          borderRadius: "10px",
                          border: savedIds.has(doc._id) ? "1px solid #fecaca" : "1px solid #dbeafe",
                          background: savedIds.has(doc._id) ? "#fef2f2" : "#f8faff",
                          color: savedIds.has(doc._id) ? "#ef4444" : "#2563eb",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = savedIds.has(doc._id) ? "#fee2e2" : "#eff6ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = savedIds.has(doc._id) ? "#fef2f2" : "#f8faff"; }}
                      >
                        <Heart size={14} fill={savedIds.has(doc._id) ? "#ef4444" : "none"} />
                      </button>
                      <button
                        onClick={() =>
                          navigate(
                            currentUser?.role === "patient"
                              ? `/patient/doctor/${doc._id}`
                              : `/doctor/${doc._id}`
                          )
                        }
                        style={{
                          flex: 1, padding: "10px",
                          borderRadius: "10px",
                          border: "1px solid #dbeafe",
                          background: "#f8faff",
                          color: "#2563eb",
                          fontSize: "13px", fontWeight: "600",
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#f8faff"}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleBookNow(doc._id)}
                        style={{
                          flex: 1, padding: "10px",
                          borderRadius: "10px",
                          border: "none",
                          background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                          color: "#fff",
                          fontSize: "13px", fontWeight: "600",
                          cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,0.35)"}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.25)"}
                      >
                        {currentUser?.role === "patient" ? "Book Now" : "Login"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {doctorsToShow.length < filteredDoctors.length && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
            <button
              onClick={() => setPage(page + 1)}
              style={{
                padding: "12px 32px",
                borderRadius: "12px",
                border: "1px solid #dbeafe",
                background: "#fff",
                color: "#2563eb",
                fontSize: "14px", fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 2px 12px rgba(37,99,235,0.08)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#eff6ff";
                e.currentTarget.style.borderColor = "#93c5fd";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#dbeafe";
              }}
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {!isLoggedIn && <PublicFooter />}
    </div>
  );
}