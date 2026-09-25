import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3, Stethoscope, User, ShieldCheck, FileText, Pill } from "lucide-react";
import API from "../util/api";
import { formatDate } from "../../utils/helpers";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --dp-blue-900: #0f2044;
    --dp-blue-700: #1e4d99;
    --dp-blue-500: #3b82f6;
    --dp-blue-100: #dbeafe;
    --dp-gray-50:  #f8fafc;
    --dp-gray-100: #f1f5f9;
    --dp-gray-200: #e2e8f0;
    --dp-gray-500: #64748b;
    --dp-gray-900: #0f172a;
  }

  .dp-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .dp-root h1, .dp-root h2, .dp-root h3 { font-family: 'Sora', sans-serif; }

  .dp-hero {
    background: linear-gradient(135deg, var(--dp-blue-900) 0%, var(--dp-blue-700) 55%, var(--dp-blue-500) 100%);
    border-radius: 20px;
    padding: 36px 32px;
    color: white;
    position: relative;
    overflow: hidden;
    margin-bottom: 22px;
  }
  .dp-hero::before {
    content: '';
    position: absolute; top: -70px; right: -70px;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
  }
  .dp-hero::after {
    content: '';
    position: absolute; bottom: -50px; left: 40px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%);
  }
  .dp-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.22);
    padding: 6px 14px; border-radius: 50px;
    font-size: 13px; font-weight: 600; color: white;
  }


  .dp-card {
    background: white;
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 2px 16px rgba(15,32,68,0.07), 0 0 0 1px rgba(15,32,68,0.04);
  }
  .dp-section-title {
    font-size: 15px;
    font-weight: 800;
    color: var(--dp-gray-900);
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

export default function AppointmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const { data } = await API.get(`/appointments/${id}/admin-detail`);
        setAppointment(data || null);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load appointment details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAppointment();
  }, [id]);

  useEffect(() => {
    const styleId = "ad-apt-styles";
    if (!document.getElementById(styleId)) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ margin: 0, color: "#2563eb", fontWeight: 600 }}>Loading appointment...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px", color: "#1e3a5f" }}>Appointment Not Found</h2>
          <p style={{ margin: "0 0 18px", color: "#64748b" }}>{error || "Unable to load appointment details"}</p>
          <button
            onClick={() => navigate("/admin/appointments")}
            style={{ border: "none", background: "linear-gradient(135deg,#2563eb,#38bdf8)", color: "#fff", padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
          >
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  const doctorName = appointment.doctor?.user?.name || "N/A";
  const patientName = appointment.patient?.name || "N/A";
  const diagnosis = appointment.prescription?.diagnosis || appointment.medicalReport?.diagnosis || "N/A";
  const medicines = Array.isArray(appointment.prescription?.medicines) ? appointment.prescription.medicines : [];
  const clinicName = appointment.doctor?.hospitalClinicName || "N/A";
  const clinicLocation = appointment.doctor?.location || "N/A";
  const fees = appointment.doctor?.fees || appointment.fees || "N/A";
  const followUp = appointment.prescription?.followUpDate || appointment.medicalReport?.followUpDate || null;
  const advice = appointment.prescription?.advice || "N/A";
  const bookedOn = formatDate(appointment.createdAt, "N/A");
  const appointmentDate = formatDate(appointment.date, appointment.date || "N/A");

  return (
    <div className="dp-root" style={{ minHeight: "100vh", background: "var(--dp-gray-50)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(10px)", background: "rgba(248,250,252,0.9)", borderBottom: "1px solid var(--dp-gray-200)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "12px 24px" }}>
          <button
            onClick={() => navigate("/admin/appointments")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--dp-gray-200)", background: "white", color: "var(--dp-gray-500)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 60px" }}>
        <div className="dp-hero">
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 28 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", margin: "0 0 6px" }}>
                Appointment Summary
              </p>
              <h1 style={{ margin: 0, fontSize: "clamp(30px,4vw,42px)", fontWeight: 800 }}>
                Appointment Details
              </h1>
              <h4 style={{ margin: "6px 0 16px", color: "rgba(255,255,255,0.7)" }}>
                {doctorName} · {patientName}
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <span className="dp-badge"><CalendarDays size={14} />{appointmentDate}</span>
                <span className="dp-badge"><Clock3 size={14} />{appointment.time || "N/A"}</span>
                <span className="dp-badge"><ShieldCheck size={14} />{appointment.status || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="dp-card">
            <SectionTitle icon={<Stethoscope size={16} />} title="Visit Details" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <InfoRow icon={<CalendarDays size={16} />} label="Date" value={appointmentDate} />
              <InfoRow icon={<Clock3 size={16} />} label="Time" value={appointment.time || "N/A"} />
              <InfoRow icon={<ShieldCheck size={16} />} label="Status" value={appointment.status || "N/A"} />
              <InfoRow icon={<User size={16} />} label="Patient" value={patientName} />
              <InfoRow icon={<Stethoscope size={16} />} label="Doctor" value={doctorName} />
              <InfoRow icon={<Stethoscope size={16} />} label="Specialization" value={appointment.doctor?.specialization || "N/A"} />
            </div>
          </div>

            <div className="dp-card">
              <SectionTitle icon={<User size={16} />} title="Appointment Summary" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <InfoRow icon={<Stethoscope size={16} />} label="Clinic" value={clinicName} />
                <InfoRow icon={<User size={16} />} label="Location" value={clinicLocation} />
                <InfoRow icon={<ShieldCheck size={16} />} label="Fees" value={fees !== "N/A" ? `₹${fees}` : "N/A"} />
                <InfoRow icon={<CalendarDays size={16} />} label="Booked On" value={bookedOn} />
                <InfoRow icon={<Clock3 size={16} />} label="Follow-up" value={formatDate(followUp, "N/A")} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="dp-card">
              <SectionTitle icon={<FileText size={16} />} title="Diagnosis" />
              <div style={{ border: "1px solid var(--dp-gray-200)", borderRadius: 12, padding: 16, background: "var(--dp-gray-100)" }}>
                <p style={{ margin: 0, color: "var(--dp-gray-500)", fontSize: 14 }}>{diagnosis}</p>
              </div>
            </div>

            <div className="dp-card">
              <SectionTitle icon={<FileText size={16} />} title="Advice" />
              <div style={{ border: "1px solid var(--dp-gray-200)", borderRadius: 12, padding: 16, background: "var(--dp-gray-100)" }}>
                <p style={{ margin: 0, color: "var(--dp-gray-500)", fontSize: 14 }}>{advice || "N/A"}</p>
              </div>
            </div>

            <div className="dp-card">
              <SectionTitle icon={<Pill size={16} />} title="Medicines" />
              {medicines.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                  {medicines.map((m, idx) => (
                    <div key={`${m.name}-${idx}`} style={{ border: "1px solid var(--dp-gray-200)", borderRadius: 12, padding: 16, background: "var(--dp-gray-100)" }}>
                      <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--dp-gray-900)" }}>{m.name || "Medicine"}</p>
                      <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--dp-gray-500)" }}><strong>Dosage:</strong> {m.dosage || "N/A"}</p>
                      <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--dp-gray-500)" }}><strong>Frequency:</strong> {m.frequency || "N/A"}</p>
                      <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--dp-gray-500)" }}><strong>Duration:</strong> {m.duration || "N/A"}</p>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--dp-gray-500)" }}><strong>Instructions:</strong> {m.instructions || "N/A"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyCard text="No medicines found for this appointment." />
              )}
            </div>
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
    <div className="dp-section-title">
      <span style={{ color: "#2563eb", display: "inline-flex" }}>{icon}</span>
      {title}
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
