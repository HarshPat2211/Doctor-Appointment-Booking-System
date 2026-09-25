import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, User, CalendarDays, ShieldCheck, Stethoscope, Clock3, Pill, FileText, MapPin } from "lucide-react";
import API from "../util/api";
import { formatDate } from "../../utils/helpers";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --pp-blue-900: #0f2044;
    --pp-blue-700: #1e4d99;
    --pp-blue-500: #3b82f6;
    --pp-blue-100: #dbeafe;
    --pp-gray-50:  #f8fafc;
    --pp-gray-100: #f1f5f9;
    --pp-gray-200: #e2e8f0;
    --pp-gray-500: #64748b;
    --pp-gray-900: #0f172a;
  }

  .pp-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .pp-root h1, .pp-root h2, .pp-root h3 { font-family: 'Sora', sans-serif; }

  .pp-hero {
    background: linear-gradient(135deg, var(--pp-blue-900) 0%, var(--pp-blue-700) 55%, var(--pp-blue-500) 100%);
    border-radius: 20px;
    padding: 36px 32px;
    color: white;
    position: relative;
    overflow: hidden;
    margin-bottom: 22px;
  }
  .pp-hero::before {
    content: '';
    position: absolute; top: -70px; right: -70px;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
  }
  .pp-hero::after {
    content: '';
    position: absolute; bottom: -50px; left: 40px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%);
  }
  .pp-chip {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.22);
    padding: 6px 14px; border-radius: 50px;
    font-size: 13px; font-weight: 600; color: white;
  }
`;

export default function PatientProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [lastAppointment, setLastAppointment] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const { data } = await API.get(`/admin/patients/${id}`);
        const patientPayload = data?.patient || (data && data._id ? data : null);
        setPatient(patientPayload);
        setLastAppointment(data?.lastAppointment || null);
        setMedications(Array.isArray(data?.medications) ? data.medications : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load patient profile");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPatient();
  }, [id]);

  useEffect(() => {
    const id = "pp-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ margin: 0, color: "#2563eb", fontWeight: 600 }}>Loading patient profile...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px", color: "#1e3a5f" }}>Patient Not Found</h2>
          <p style={{ margin: "0 0 18px", color: "#64748b" }}>{error || "Unable to load patient profile"}</p>
          <button
            onClick={() => navigate("/admin/patients")}
            style={{ border: "none", background: "linear-gradient(135deg,#2563eb,#38bdf8)", color: "#fff", padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  const joinedOn = formatDate(patient.createdAt, "N/A");
  const displayGender = String(patient.gender || "").trim() || "N/A";
  const displayAddress = patient.residentialAddress || patient.address || "N/A";
  const lastAppointmentDate = formatDate(lastAppointment?.date, lastAppointment?.date || "N/A");

  return (
    <div className="pp-root" style={{ minHeight: "100vh", background: "var(--pp-gray-50)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(10px)", background: "rgba(248,250,252,0.9)", borderBottom: "1px solid var(--pp-gray-200)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "12px 24px" }}>
          <button
            onClick={() => navigate("/admin/patients")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--pp-gray-200)", background: "white", color: "var(--pp-gray-500)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "36px 24px 60px" }}>
        <div className="pp-hero">
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", margin: "0 0 6px" }}>
              Patient Overview
            </p>
            <h1 style={{ margin: 0, fontSize: "clamp(24px,3vw,34px)", fontWeight: 800 }}>
              {patient.name || "Patient"}
            </h1>
            <p style={{ margin: "6px 0 16px", color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
              Admin view of patient details
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span className="pp-chip"><Mail size={14} />{patient.email || "N/A"}</span>
              <span className="pp-chip"><Phone size={14} />{patient.phone || patient.mobileNumber || "N/A"}</span>
              <span className="pp-chip"><User size={14} />{displayGender}</span>
              <span className="pp-chip"><MapPin size={14} />{displayAddress}</span>
              <span className="pp-chip"><ShieldCheck size={14} />{patient.isVerified ? "Verified" : "Unverified"}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--pp-gray-200)", boxShadow: "0 2px 16px rgba(15,32,68,0.07)", padding: 22 }}>
            <SectionTitle icon={<User size={16} />} title="Patient Details" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InfoRow icon={<User size={16} />} label="Full Name" value={patient.name || "N/A"} />
              <InfoRow icon={<Mail size={16} />} label="Email" value={patient.email || "N/A"} />
              <InfoRow icon={<Phone size={16} />} label="Phone" value={patient.phone || patient.mobileNumber || "N/A"} />
              <InfoRow icon={<User size={16} />} label="Gender" value={displayGender} />
              <InfoRow icon={<MapPin size={16} />} label="Address" value={displayAddress} />
              <InfoRow icon={<ShieldCheck size={16} />} label="Role" value={patient.role || "patient"} />
              <InfoRow icon={<CalendarDays size={16} />} label="Joined On" value={joinedOn} />
              <InfoRow icon={<ShieldCheck size={16} />} label="Status" value={patient.isVerified ? "Verified" : "Unverified"} />
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--pp-gray-200)", boxShadow: "0 2px 16px rgba(15,32,68,0.07)", padding: 22 }}>
            <SectionTitle icon={<Stethoscope size={16} />} title="Last Appointment Details" />
            {lastAppointment ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <InfoRow icon={<CalendarDays size={16} />} label="Date" value={lastAppointmentDate} />
                <InfoRow icon={<Clock3 size={16} />} label="Time" value={lastAppointment.time || "N/A"} />
                <InfoRow icon={<ShieldCheck size={16} />} label="Status" value={lastAppointment.status || "N/A"} />
                <InfoRow icon={<Stethoscope size={16} />} label="Doctor" value={lastAppointment.doctorName || "N/A"} />
                <InfoRow icon={<Stethoscope size={16} />} label="Specialization" value={lastAppointment.specialization || "N/A"} />
                <InfoRow icon={<FileText size={16} />} label="Diagnosis" value={lastAppointment.diagnosis || "N/A"} />
              </div>
            ) : (
              <EmptyCard text="No appointment history found for this patient." />
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--pp-gray-200)", boxShadow: "0 2px 16px rgba(15,32,68,0.07)", padding: 22 }}>
            <SectionTitle icon={<Pill size={16} />} title="Medication Details" />
            {medications.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {medications.map((m, idx) => (
                  <div key={`${m.name}-${idx}`} style={{ border: "1px solid var(--pp-gray-200)", borderRadius: 12, padding: 14, background: "var(--pp-gray-100)" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--pp-gray-900)" }}>{m.name || "Medicine"}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--pp-gray-500)" }}><strong>Dosage:</strong> {m.dosage || "N/A"}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--pp-gray-500)" }}><strong>Frequency:</strong> {m.frequency || "N/A"}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--pp-gray-500)" }}><strong>Duration:</strong> {m.duration || "N/A"}</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--pp-gray-500)" }}><strong>Instructions:</strong> {m.instructions || "N/A"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCard text="No medication details found for the latest appointment." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 14px", background: "#f8faff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
        <span style={{ color: "#2563eb", display: "inline-flex" }}>{icon}</span>
        {label}
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1e3a5f" }}>{value}</p>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 4 }}>
      <span style={{ color: "#2563eb", display: "inline-flex" }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e3a5f" }}>{title}</h3>
    </div>
  );
}

function EmptyCard({ text }) {
  return (
    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: "14px 14px", background: "#f8fafc", marginBottom: 20 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{text}</p>
    </div>
  );
}
