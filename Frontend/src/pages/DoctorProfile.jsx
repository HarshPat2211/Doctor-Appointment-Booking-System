import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Calendar, Clock, MapPin, Award, Star, ChevronDown, Stethoscope, User } from "lucide-react";
import Loader from "../Componet/Loader";
import DoctorAvatar from "../Componet/DoctorAvatar";
import PublicHeader from "../Componet/PublicHeader";
import PublicFooter from "../Componet/PublicFooter";
import { getCurrentUser, getStoredAuth } from "../utils/authHelpers";

/* ─────────────────────────────────────────────
   Inline styles / keyframes injected once
───────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

  :root {
    --blue-950: #0a1628;
    --blue-900: #0f2044;
    --blue-800: #1a3a6e;
    --blue-700: #1e4d99;
    --blue-600: #2563eb;
    --blue-500: #3b82f6;
    --blue-400: #60a5fa;
    --blue-300: #93c5fd;
    --blue-100: #dbeafe;
    --blue-50:  #eff6ff;
    --white:    #ffffff;
    --gray-50:  #f8fafc;
    --gray-100: #f1f5f9;
    --gray-200: #e2e8f0;
    --gray-400: #94a3b8;
    --gray-500: #64748b;
    --gray-700: #334155;
    --gray-900: #0f172a;
  }

  .dp-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .dp-root h1, .dp-root h2, .dp-root h3 { font-family: 'Sora', sans-serif; }

  /* ── Skeleton shimmer ── */
  @keyframes shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 10px;
  }

  /* ── Fade-up entrance ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) both; }
  .fade-up-1 { animation-delay: 0.05s; }
  .fade-up-2 { animation-delay: 0.12s; }
  .fade-up-3 { animation-delay: 0.20s; }
  .fade-up-4 { animation-delay: 0.28s; }
  .fade-up-5 { animation-delay: 0.36s; }

  /* ── Hero gradient ── */
  .dp-hero {
    background: linear-gradient(135deg, var(--blue-900) 0%, var(--blue-700) 55%, var(--blue-500) 100%);
    border-radius: 20px;
    padding: 44px 40px;
    color: var(--white);
    position: relative;
    overflow: hidden;
  }
  .dp-hero::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 320px; height: 320px;
    background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
    pointer-events: none;
  }
  .dp-hero::after {
    content: '';
    position: absolute;
    bottom: -60px; left: 40px;
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── Badge chips in hero ── */
  .dp-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.14);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.22);
    padding: 8px 16px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    color: white;
    white-space: nowrap;
  }

  /* ── Card ── */
  .dp-card {
    background: var(--white);
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 2px 16px rgba(15,32,68,0.07), 0 0 0 1px rgba(15,32,68,0.04);
    transition: box-shadow 0.2s;
  }
  .dp-card:hover { box-shadow: 0 6px 28px rgba(15,32,68,0.11), 0 0 0 1px rgba(15,32,68,0.06); }

  .dp-card-accent-blue { border-left: 4px solid var(--blue-500); }
  .dp-card-accent-teal { border-left: 4px solid #0ea5e9; }
  .dp-card-accent-green { border-left: 4px solid #22c55e; }

  /* ── Section title ── */
  .dp-section-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0 0 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: -0.2px;
  }

  /* ── Fee display ── */
  .dp-fee-amount {
    font-family: 'Sora', sans-serif;
    font-size: 42px;
    font-weight: 800;
    color: var(--blue-600);
    letter-spacing: -1px;
    line-height: 1;
  }
  .dp-fee-sub { font-size: 14px; color: var(--gray-500); margin-left: 6px; font-weight: 400; }

  /* ── Availability pill ── */
  .dp-avail-pill {
    border-radius: 14px;
    padding: 16px 12px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    transition: transform 0.18s;
    line-height: 1.2;
    word-break: break-word;
    hyphens: auto;
    overflow: hidden;
  }
  .dp-avail-pill:hover { transform: translateY(-2px); }
  .dp-avail-pill.active  { background: #f0fdf4; border: 2px solid #22c55e; color: #15803d; }
  .dp-avail-pill.inactive{ background: var(--gray-100); border: 2px solid var(--gray-200); color: var(--gray-400); opacity: 0.6; }

  /* ── Review card ── */
  .dp-review {
    border: 1px solid var(--gray-200);
    border-radius: 14px;
    padding: 18px 20px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .dp-review:hover { border-color: var(--blue-300); box-shadow: 0 2px 12px rgba(37,99,235,0.07); }

  /* ── Booking card ── */
  .dp-booking-card {
    background: var(--white);
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 8px 40px rgba(15,32,68,0.12), 0 0 0 1px rgba(15,32,68,0.05);
    position: relative;
  }
  .dp-book-btn {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, var(--blue-700) 0%, var(--blue-500) 100%);
    color: white;
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 18px rgba(37,99,235,0.35);
    transition: transform 0.18s, box-shadow 0.18s;
    position: relative;
    overflow: hidden;
  }
  .dp-book-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.12) 100%);
  }
  .dp-book-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(37,99,235,0.42); }
  .dp-book-btn:active{ transform: translateY(0); }

  /* ── Info row inside booking card ── */
  .dp-info-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 13.5px;
    color: var(--gray-500);
    padding: 10px 0;
    border-bottom: 1px solid var(--gray-100);
  }
  .dp-info-row:last-of-type { border-bottom: none; }
  .dp-info-icon { color: var(--blue-500); flex-shrink: 0; margin-top: 1px; }

  /* ── Qual bullet ── */
  .dp-qual-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--gray-100);
  }
  .dp-qual-item:last-child { border-bottom: none; }
  .dp-qual-dot { width: 8px; height: 8px; background: var(--blue-500); border-radius: 50%; flex-shrink: 0; margin-top: 6px; }

  /* ── Star filled ── */
  .star-fill { color: #f59e0b; fill: #f59e0b; }

  /* ── Dropdown wrapper (availability) ── */
  .dp-dropdown-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
  }
  .dp-chevron { transition: transform 0.25s; }
  .dp-chevron.open { transform: rotate(180deg); }

  .dp-collapsible {
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s;
    opacity: 1;
  }
  .dp-collapsible.closed { max-height: 0 !important; opacity: 0; }

  /* ── Rating bar ── */
  .dp-rating-bar-bg { background: var(--gray-100); border-radius: 99px; height: 8px; flex: 1; overflow: hidden; }
  .dp-rating-bar-fill { background: linear-gradient(90deg, var(--blue-500), #60a5fa); height: 100%; border-radius: 99px; transition: width 0.6s ease; }

  /* ── Specialization pill ── */
  .dp-spec-pill {
    display: inline-block;
    background: var(--blue-50);
    color: var(--blue-700);
    border: 1px solid var(--blue-100);
    border-radius: 50px;
    padding: 4px 14px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .dp-hero { padding: 30px 22px; }
    .dp-fee-amount { font-size: 34px; }
  }
`;

/* ── Skeleton loading screen ── */
function ProfileSkeleton() {
  return (
    <div className="dp-root" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div className="skeleton" style={{ height: 220, marginBottom: 28 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 140, gridColumn: "1 / 3" }} />
        <div className="skeleton" style={{ height: 140 }} />
      </div>
      <div className="skeleton" style={{ height: 90, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 120 }} />
    </div>
  );
}

/* ── Collapsible section ── */
function Collapsible({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="dp-dropdown-toggle" onClick={() => setOpen(o => !o)}>
        <h2 className="dp-section-title" style={{ margin: 0 }}>
          {icon}
          {title}
        </h2>
        <ChevronDown size={18} style={{ color: "var(--blue-500)" }} className={`dp-chevron ${open ? "open" : ""}`} />
      </div>
      <div
        className={`dp-collapsible ${open ? "" : "closed"}`}
        style={{ maxHeight: open ? 1200 : 0, marginTop: open ? 18 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Star row ── */
function Stars({ rating }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} style={n <= Math.round(rating) ? { color: "#f59e0b", fill: "#f59e0b" } : { color: "#cbd5e1" }} />
      ))}
    </div>
  );
}

export default function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [doctor, setDoctor] = useState(null);
  const [reviewsData, setReviewsData] = useState({ averageRating: 0, totalReviews: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const user = getCurrentUser();
  const token = getStoredAuth()?.token;
  const isPatientLayoutView = user?.role === "patient" && location.pathname.startsWith("/patient/");
  const isAdminPreview = Boolean(location.state?.fromAdmin);
  const showBackHeader = isPatientLayoutView || Boolean(location.state?.backTo);
  const showPublicShell = !showBackHeader && !isAdminPreview;

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/doctors/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const reviewsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/doctors/${id}/reviews`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setDoctor(res.data);
        setReviewsData(reviewsRes.data || { averageRating: 0, totalReviews: 0, reviews: [] });
        setError(null);
      } catch (err) {
        console.error("Error fetching doctor:", err);
        setError(err.response?.data?.message || "Failed to load doctor profile");
        setDoctor(null);
        setReviewsData({ averageRating: 0, totalReviews: 0, reviews: [] });
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDoctor();
  }, [id, token]);

  const handleBookAppointment = () => {
    if (!user || user.role !== "patient") { navigate("/login"); return; }
    navigate(`/patient/calendar/${id}`);
  };

  const handleBack = () => {
    if (location.state?.backTo) {
      navigate(location.state.backTo);
      return;
    }
    navigate(-1);
  };

  /* ── Inject styles once ── */
  useEffect(() => {
    const id = "dp-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  const backHeader = (isAdminPreview || showBackHeader) ? (
    <div style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(10px)", background: "rgba(248,250,252,0.9)", borderBottom: "1px solid var(--gray-200)" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "12px 24px" }}>
        <button
          onClick={handleBack}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--gray-200)", background: "white", color: "var(--gray-700)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}>
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
    </div>
  ) : null;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="dp-root" style={{ minHeight: "100vh", background: "var(--gray-50)" }}>
        {showPublicShell && <PublicHeader sticky />}
        {backHeader}
        <ProfileSkeleton />
        {showPublicShell && <PublicFooter />}
      </div>
    );
  }

  /* ── Error ── */
  if (error || !doctor) {
    return (
      <div className="dp-root" style={{ minHeight: "100vh", background: "var(--white)" }}>
        {showPublicShell && <PublicHeader sticky />}
        {backHeader}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: isPatientLayoutView ? "100vh" : "70vh", padding: "0 24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 72, height: 72, background: "var(--blue-50)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <span style={{ fontSize: 32 }}>🔍</span>
            </div>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: "var(--gray-900)", marginBottom: 10 }}>Doctor Not Found</h1>
            <p style={{ color: "var(--gray-500)", marginBottom: 28, fontSize: 15 }}>{error || "Unable to load doctor profile"}</p>
            <Link
              to={user?.role === "patient" ? "/patient/browse-services" : "/browse-doctors"}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "linear-gradient(135deg,var(--blue-700),var(--blue-500))", color: "white", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 14, fontFamily: "'Sora',sans-serif", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}
            >
              <ArrowLeft size={18} />
              Back to Doctors
            </Link>
          </div>
        </div>
        {showPublicShell && <PublicFooter />}
      </div>
    );
  }

  const ratingPct = (reviewsData.averageRating / 5) * 100;
  const experienceYears = doctor.yearsOfExperience ?? doctor.experience ?? 0;
  const doctorAge = doctor.user?.age;

  return (
    <div className="dp-root" style={{ minHeight: "100vh", background: "var(--gray-50)" }}>
      {showPublicShell && <PublicHeader sticky />}

      {backHeader}

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 60px" }}>

        {/* ── HERO ── */}
        <div className="dp-hero fade-up fade-up-1" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 36, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "3px solid rgba(255,255,255,0.35)", borderRadius: "50%", padding: 4, display: "inline-block" }}>
                <DoctorAvatar doctor={doctor} size="w-36 h-36" textClass="text-4xl" borderClass="" />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(26px,4vw,38px)", fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
                {doctor.user?.name || "Doctor"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
                <Stars rating={reviewsData.averageRating} />
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginLeft: 4 }}>
                  {reviewsData.averageRating.toFixed(1)} · {reviewsData.totalReviews} reviews
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {doctor.specialization && <span className="dp-badge"><Stethoscope size={16} />{doctor.specialization}</span>}
                <span className="dp-badge"><Award size={16} />{experienceYears} Yrs Experience</span>
                <span className="dp-badge"><Star size={16} style={{ fill: "#fbbf24", color: "#fbbf24" }} />{reviewsData.averageRating.toFixed(1)} Rating</span>
                {doctorAge ? <span className="dp-badge"><User size={16} />{doctorAge} Yrs</span> : null}
                {doctor.location && <span className="dp-badge"><MapPin size={16} />{doctor.location}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Fee card */}
            <div className="dp-card dp-card-accent-blue fade-up fade-up-2">
              <h2 className="dp-section-title">Consultation Fee</h2>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span className="dp-fee-amount">₹{doctor.fees}</span>
                <span className="dp-fee-sub">/ consultation</span>
              </div>
            </div>

            {/* Qualifications */}
            <div className="dp-card fade-up fade-up-3">
              <Collapsible title="Qualifications" icon={<Award size={20} style={{ color: "var(--blue-500)" }} />}>
                <div>
                  <div className="dp-qual-item">
                    <span className="dp-qual-dot" />
                    <span style={{ color: "var(--gray-700)", fontSize: 15 }}>MD in {doctor.specialization}</span>
                  </div>
                  <div className="dp-qual-item">
                    <span className="dp-qual-dot" />
                    <span style={{ color: "var(--gray-700)", fontSize: 15 }}>Board Certified Specialist</span>
                  </div>
                  <div className="dp-qual-item">
                    <span className="dp-qual-dot" />
                    <span style={{ color: "var(--gray-700)", fontSize: 15 }}>{experienceYears}+ years of clinical experience</span>
                  </div>
                </div>
              </Collapsible>
            </div>

            {doctor.availability && (
              <div className="dp-card fade-up fade-up-4">
                <Collapsible title="Availability" icon={<Calendar size={20} style={{ color: "#22c55e" }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 12 }}>
                    {Object.entries(doctor.availability)
                      .filter(([day]) => ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(day.toLowerCase()))
                      .map(([day, times]) => {
                      const hasSlots = Array.isArray(times) && times.length > 0;
                      return (
                        <div key={day} className={`dp-avail-pill ${hasSlots ? "active" : "inactive"}`}>
                          <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{day}</p>
                          {hasSlots
                            ? <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{times.length} slots</p>
                            : <p style={{ margin: 0, fontSize: 12, fontWeight: 400, opacity: 0.7 }}>No slots</p>}
                        </div>
                      );
                    })}
                  </div>
                </Collapsible>
              </div>
            )}

            {(doctor.hospitalClinicName || doctor.hospitalClinicAddress || doctor.medicalQualification || doctor.medicalRegistrationId) && (
              <div className="dp-card fade-up fade-up-4">
                <Collapsible title="Clinic Details" icon={<MapPin size={20} style={{ color: "var(--blue-500)" }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {doctor.hospitalClinicName && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ color: "var(--gray-500)", fontSize: 13 }}>Clinic</span>
                        <span style={{ color: "var(--gray-700)", fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                          {doctor.hospitalClinicName}
                        </span>
                      </div>
                    )}
                    {doctor.hospitalClinicAddress && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ color: "var(--gray-500)", fontSize: 13 }}>Address</span>
                        <span style={{ color: "var(--gray-700)", fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                          {doctor.hospitalClinicAddress}
                        </span>
                      </div>
                    )}
                    {doctor.medicalQualification && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ color: "var(--gray-500)", fontSize: 13 }}>Qualification</span>
                        <span style={{ color: "var(--gray-700)", fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                          {doctor.medicalQualification}
                        </span>
                      </div>
                    )}
                    {doctor.medicalRegistrationId && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ color: "var(--gray-500)", fontSize: 13 }}>Reg. ID</span>
                        <span style={{ color: "var(--gray-700)", fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                          {doctor.medicalRegistrationId}
                        </span>
                      </div>
                    )}
                  </div>
                </Collapsible>
              </div>
            )}

          </div>

          {/* ── Right column: Availability + Booking ── */}
          <div className="fade-up fade-up-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="dp-booking-card">
              <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--gray-900)", marginBottom: 6 }}>Book a Session</h3>
              <p style={{ fontSize: 13, color: "var(--gray-400)", margin: "0 0 20px" }}>Secure your appointment instantly</p>

              <div style={{ marginBottom: 22 }}>
                <div className="dp-info-row">
                  <Clock size={16} className="dp-info-icon" />
                  <span>30–45 min consultation</span>
                </div>
                <div className="dp-info-row">
                  <Calendar size={16} className="dp-info-icon" />
                  <span>Choose your preferred time</span>
                </div>
                <div className="dp-info-row">
                  <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: "var(--blue-600)", lineHeight: 1 }}>₹{doctor.fees}</span>
                  <span style={{ alignSelf: "center" }}>per session</span>
                </div>
              </div>

              <button className="dp-book-btn" onClick={handleBookAppointment}>
                Book Appointment
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
                <div style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%" }} />
                <p style={{ fontSize: 12, color: "var(--gray-400)", margin: 0 }}>Instant confirmation after booking</p>
              </div>

              {/* Doctor quick stat */}
              <div style={{ marginTop: 22, padding: "14px 16px", background: "var(--blue-50)", borderRadius: 12, display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--blue-700)", margin: 0 }}>{doctor.experience}+</p>
                  <p style={{ fontSize: 11, color: "var(--blue-600)", margin: 0 }}>Years Exp.</p>
                </div>
                <div style={{ width: 1, background: "var(--blue-100)" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--blue-700)", margin: 0 }}>{reviewsData.averageRating.toFixed(1)}</p>
                  <p style={{ fontSize: 11, color: "var(--blue-600)", margin: 0 }}>Rating</p>
                </div>
                <div style={{ width: 1, background: "var(--blue-100)" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--blue-700)", margin: 0 }}>{reviewsData.totalReviews}</p>
                  <p style={{ fontSize: 11, color: "var(--blue-600)", margin: 0 }}>Reviews</p>
                </div>
              </div>
            </div>

            <div className="dp-card fade-up fade-up-4">
              <Collapsible title="Care Highlights" icon={<Star size={20} style={{ color: "#f59e0b", fill: "#f59e0b" }} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    "Digital prescriptions after consultation",
                    "Follow-up guidance for ongoing care",
                    "Patient-friendly explanations",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue-500)", marginTop: 6, flexShrink: 0 }} />
                      <span style={{ color: "var(--gray-700)", fontSize: 14 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </Collapsible>
            </div>
          </div>

        </div>

        {/* ── Full width: About + Reviews ── */}
        <div style={{ maxWidth: 920, margin: "24px auto 0", display: "flex", flexDirection: "column", gap: 20 }}>
          {doctor.about && (
            <div className="dp-card fade-up fade-up-4">
              <Collapsible title="About" icon={<span style={{ fontSize: 18 }}>👤</span>}>
                <p style={{ color: "var(--gray-700)", lineHeight: 1.75, fontSize: 15, margin: 0 }}>{doctor.about}</p>
              </Collapsible>
            </div>
          )}

          <div className="dp-card fade-up fade-up-5">
            <Collapsible
              title={`Reviews (${reviewsData.totalReviews})`}
              icon={<Star size={20} style={{ color: "#f59e0b", fill: "#f59e0b" }} />}
            >
              {/* Rating summary bar */}
              {reviewsData.totalReviews > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0 24px", borderBottom: "1px solid var(--gray-100)", marginBottom: 20 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 48, fontWeight: 800, color: "var(--blue-700)", lineHeight: 1 }}>
                      {reviewsData.averageRating.toFixed(1)}
                    </div>
                    <Stars rating={reviewsData.averageRating} />
                    <p style={{ fontSize: 12, color: "var(--gray-400)", margin: "6px 0 0" }}>{reviewsData.totalReviews} reviews</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="dp-rating-bar-bg" style={{ marginBottom: 8 }}>
                      <div className="dp-rating-bar-fill" style={{ width: `${ratingPct}%` }} />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Overall satisfaction</p>
                  </div>
                </div>
              )}

              {reviewsData.reviews.length === 0 ? (
                <p style={{ color: "var(--gray-400)", fontSize: 14, textAlign: "center", padding: "24px 0" }}>No reviews yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {(showAllReviews ? reviewsData.reviews : reviewsData.reviews.slice(0, 2)).map((item) => (
                    <div key={item._id} className="dp-review">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--gray-900)", margin: "0 0 4px" }}>{item.patientName}</p>
                          <Stars rating={item.rating} />
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--blue-50)", color: "var(--blue-700)", borderRadius: 50, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                            <Star size={11} style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                            {item.rating}/5
                          </span>
                          <p style={{ fontSize: 11, color: "var(--gray-400)", margin: "6px 0 0" }}>{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p style={{ color: "var(--gray-700)", fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{item.comment || "No written feedback"}</p>
                    </div>
                  ))}
                  {reviewsData.reviews.length > 2 && !showAllReviews && (
                    <button
                      type="button"
                      onClick={() => setShowAllReviews(true)}
                      style={{
                        alignSelf: "center",
                        padding: "10px 16px",
                        borderRadius: 10,
                        border: "1px solid var(--blue-200)",
                        background: "var(--blue-50)",
                        color: "var(--blue-700)",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      View all reviews
                    </button>
                  )}
                </div>
              )}
            </Collapsible>
          </div>
        </div>
      </div>

      {showPublicShell && <PublicFooter />}
    </div>
  );
}