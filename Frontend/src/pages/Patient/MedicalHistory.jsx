import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { FileText, Download, Calendar, Clock, Stethoscope, X, Pill, ClipboardList } from "lucide-react";
import API from "../util/api";
import { showToast } from "../../Redux/toastSlice";

export default function MedicalHistory() {
  const dispatch = useDispatch();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await API.get("/appointments/medical-history");
        setHistory(data || []);
      } catch (error) {
        dispatch(showToast({ message: error.response?.data?.message || "Failed to load medical history", type: "error" }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dispatch]);

  const downloadPrescription = async (id) => {
    try {
      const response = await API.get(`/appointments/${id}/prescription/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `prescription-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Download failed", type: "error" }));
    }
  };

  const viewPrescription = async (id) => {
    try {
      const { data } = await API.get(`/appointments/${id}/prescription`);
      setSelectedPrescription(data);
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Prescription not found", type: "error" }));
    }
  };

  const formatDoctorName = (name) => {
    if (!name) return "Doctor";
    const trimmed = String(name).trim();
    return trimmed.replace(/^dr\.?\s+/i, "");
  };

  if (loading) return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "44px", height: "44px", borderRadius: "50%",
            border: "3px solid #dbeafe", borderTopColor: "#2563eb",
            animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
          }}
        />
        <p style={{ color: "#2563eb", fontSize: "14px", fontWeight: "500" }}>Loading medical history...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 60%, #e8f4ff 100%)",
        padding: "28px",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                width: "38px", height: "38px", borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", flexShrink: 0,
                boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
              }}
            >
              <ClipboardList size={18} />
            </div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#1e3a5f" }}>
              Medical History
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b", paddingLeft: "48px" }}>
            Your complete appointment & prescription timeline
          </p>
        </div>

        {history.length === 0 ? (
          <div
            style={{
              background: "#fff", borderRadius: "16px",
              padding: "48px", textAlign: "center",
              border: "1px solid #dbeafe",
              boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
            }}
          >
            <ClipboardList size={36} style={{ color: "#bfdbfe", margin: "0 auto 12px" }} />
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>No completed appointments yet.</p>
          </div>
        ) : (
          /* Timeline */
          <div style={{ position: "relative" }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: "19px",
                top: "24px",
                bottom: "24px",
                width: "2px",
                background: "linear-gradient(to bottom, #bfdbfe, #e0f0ff)",
                borderRadius: "2px",
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {history.map((item) => (
                <div key={item._id} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

                  {/* Timeline dot */}
                  <div
                    style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", flexShrink: 0, zIndex: 1,
                      boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                      border: "3px solid #fff",
                    }}
                  >
                    <Stethoscope size={16} />
                  </div>

                  {/* Card */}
                  <div
                    style={{
                      flex: 1,
                      background: "#fff",
                      borderRadius: "16px",
                      padding: "20px",
                      border: "1px solid #dbeafe",
                      boxShadow: "0 2px 16px rgba(37,99,235,0.06)",
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e3a5f" }}>
                          Dr. {formatDoctorName(item.doctor?.user?.name)}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#2563eb", fontWeight: "500" }}>
                          {item.doctor?.specialization || "Specialist"}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                          <Calendar size={13} style={{ color: "#60a5fa" }} />
                          <span style={{ fontSize: "12px", color: "#64748b" }}>{item.date}</span>
                          <Clock size={13} style={{ color: "#60a5fa" }} />
                          <span style={{ fontSize: "12px", color: "#64748b" }}>{item.time}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "4px 12px", borderRadius: "20px",
                          fontSize: "11px", fontWeight: "700",
                          background: "#ecfdf5", color: "#059669",
                          border: "1px solid #a7f3d0",
                          textTransform: "capitalize",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Medical report */}
                    {item.medicalReport && (
                      <div
                        style={{
                          background: "linear-gradient(135deg, #f8faff, #eff6ff)",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          border: "1px solid #dbeafe",
                          marginBottom: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {item.medicalReport.diagnosis && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", minWidth: "90px" }}>Diagnosis</span>
                            <span style={{ fontSize: "13px", color: "#1e3a5f" }}>{item.medicalReport.diagnosis}</span>
                          </div>
                        )}
                        {item.medicalReport.prescription && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", minWidth: "90px" }}>Prescription</span>
                            <span style={{ fontSize: "13px", color: "#1e3a5f", whiteSpace: "pre-wrap" }}>{item.medicalReport.prescription}</span>
                          </div>
                        )}
                        {item.medicalReport.followUpDate && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", minWidth: "90px" }}>Follow-up</span>
                            <span
                              style={{
                                fontSize: "12px", fontWeight: "600",
                                color: "#2563eb", background: "#dbeafe",
                                padding: "2px 10px", borderRadius: "20px",
                              }}
                            >
                              {new Date(item.medicalReport.followUpDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <button
                        onClick={() => viewPrescription(item._id)}
                        style={{
                          padding: "8px 16px", borderRadius: "10px",
                          background: "#eff6ff", border: "1px solid #bfdbfe",
                          color: "#2563eb", fontSize: "13px", fontWeight: "600",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#dbeafe"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#eff6ff"}
                      >
                        <FileText size={14} /> View Prescription
                      </button>
                      <button
                        onClick={() => downloadPrescription(item._id)}
                        style={{
                          padding: "8px 16px", borderRadius: "10px",
                          background: "#f0fdf4", border: "1px solid #bbf7d0",
                          color: "#16a34a", fontSize: "13px", fontWeight: "600",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#dcfce7"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#f0fdf4"}
                      >
                        <Download size={14} /> Download PDF
                      </button>
                    </div>

                    {/* Review */}
                    {item.review && (
                      <div
                        style={{
                          marginTop: "12px", padding: "10px 14px",
                          background: "#fffbeb", border: "1px solid #fde68a",
                          borderRadius: "10px", fontSize: "12px", color: "#92400e",
                          display: "flex", alignItems: "center", gap: "6px",
                        }}
                      >
                        <span style={{ fontWeight: "700" }}>⭐ {item.review.rating}/5</span>
                        {item.review.comment && <span>· {item.review.comment}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prescription Modal */}
      {selectedPrescription && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: "580px",
              background: "#fff", borderRadius: "20px",
              padding: "28px",
              maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              border: "1px solid #dbeafe",
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  <FileText size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e3a5f" }}>
                    Prescription
                  </h3>
                  <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                    Version {selectedPrescription.version}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrescription(null)}
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  border: "1px solid #dbeafe", background: "#f8faff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#64748b",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* 💡 Patient-Friendly Summary */}
            {selectedPrescription.patientSummary && (
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  border: "1.5px solid #a7f3d0",
                  marginBottom: "16px",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.08)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "14px" }}>💡</span>
                  <p style={{ margin: 0, fontSize: "11.5px", fontWeight: "800", color: "#065f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    How to Take Your Medicine (Simple Guide)
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#047857", fontWeight: "600", lineHeight: "1.5" }}>
                  {selectedPrescription.patientSummary}
                </p>
              </div>
            )}

            {/* Diagnosis */}
            <div
              style={{
                background: "#eff6ff", borderRadius: "12px",
                padding: "14px 16px", border: "1px solid #bfdbfe",
                marginBottom: "16px",
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Diagnosis
              </p>
              <p style={{ margin: 0, fontSize: "14px", color: "#1e3a5f", fontWeight: "500" }}>
                {selectedPrescription.diagnosis || "N/A"}
              </p>
            </div>

            {/* Medicines */}
            {selectedPrescription.medicines?.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <Pill size={14} style={{ color: "#2563eb" }} />
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>Medicines</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedPrescription.medicines.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 14px", borderRadius: "10px",
                        background: "#f8faff", border: "1px solid #dbeafe",
                        display: "flex", alignItems: "center", gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "28px", height: "28px", borderRadius: "8px",
                          background: "#eff6ff", border: "1px solid #bfdbfe",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#2563eb", flexShrink: 0,
                          fontSize: "11px", fontWeight: "700",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>{m.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                          {m.dosage} · {m.frequency} · {m.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advice */}
            {selectedPrescription.advice && (
              <div
                style={{
                  background: "#fffbeb", borderRadius: "10px",
                  padding: "12px 14px", border: "1px solid #fde68a",
                  marginBottom: "20px",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Advice
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "#78350f" }}>{selectedPrescription.advice}</p>
              </div>
            )}

            {/* Close */}
            <button
              onClick={() => setSelectedPrescription(null)}
              style={{
                width: "100%", padding: "12px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                color: "#fff", fontSize: "14px", fontWeight: "700",
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}