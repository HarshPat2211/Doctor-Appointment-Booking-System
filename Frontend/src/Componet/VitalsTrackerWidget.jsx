import React, { useState, useEffect } from "react";
import {
  Heart,
  Activity,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import API from "../pages/util/api";

export default function VitalsTrackerWidget() {
  const [vitals, setVitals] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    systolic: "",
    diastolic: "",
    bloodSugar: "",
    weight: "",
    pulse: "",
    notes: ""
  });

  useEffect(() => {
    fetchVitals();
  }, []);

  const fetchVitals = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/vitals/my");
      setVitals(data.vitals || []);
      setTrendData(data.trendData || null);
    } catch (err) {
      console.error("Failed to load vitals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.systolic || !form.diastolic) {
      setMessage({ type: "error", text: "Please provide both Systolic and Diastolic values." });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      await API.post("/vitals", {
        systolic: Number(form.systolic),
        diastolic: Number(form.diastolic),
        bloodSugar: form.bloodSugar ? Number(form.bloodSugar) : null,
        weight: form.weight ? Number(form.weight) : null,
        pulse: form.pulse ? Number(form.pulse) : null,
        notes: form.notes || ""
      });

      setMessage({ type: "success", text: "Vitals recorded successfully!" });
      setForm({ systolic: "", diastolic: "", bloodSugar: "", weight: "", pulse: "", notes: "" });
      setShowLogModal(false);
      await fetchVitals();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to record vitals." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPreset = (sys, dia, sugar, wt) => {
    setForm({
      systolic: String(sys),
      diastolic: String(dia),
      bloodSugar: sugar ? String(sugar) : "",
      weight: wt ? String(wt) : "",
      pulse: "72",
      notes: "Quick check reading"
    });
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/vitals/${id}`);
      await fetchVitals();
    } catch (err) {
      console.error("Failed to delete vital:", err);
    }
  };

  // Prepare chart data (chronological)
  const chartData = vitals.map((v) => {
    const d = new Date(v.recordedAt);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      systolic: v.systolic,
      diastolic: v.diastolic,
      bloodSugar: v.bloodSugar || null,
      weight: v.weight || null
    };
  });

  const latest = trendData?.metrics?.latest || (vitals.length > 0 ? vitals[vitals.length - 1] : null);
  const trendPercent = trendData?.metrics?.systolicTrendPercent || 0;
  const trendDir = trendData?.metrics?.trendDirection || "stable";

  const getBpCategory = (sys, dia) => {
    if (!sys || !dia) return { label: "Unknown", color: "#64748b", bg: "#f1f5f9" };
    if (sys < 120 && dia < 80) return { label: "Normal BP", color: "#059669", bg: "#ecfdf5" };
    if (sys <= 129 && dia < 80) return { label: "Elevated", color: "#d97706", bg: "#fffbeb" };
    if (sys <= 139 || dia <= 89) return { label: "Stage 1 Hypertension", color: "#ea580c", bg: "#fff7ed" };
    return { label: "Stage 2 Hypertension", color: "#dc2626", bg: "#fef2f2" };
  };

  const bpCat = latest ? getBpCategory(latest.systolic, latest.diastolic) : null;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "20px 24px",
        marginBottom: "24px",
        boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(244, 63, 94, 0.3)"
            }}
          >
            <Heart size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              Vitals & Health Tracker
              {bpCat && (
                <span style={{ fontSize: "11px", fontWeight: "700", background: bpCat.bg, color: bpCat.color, padding: "2px 8px", borderRadius: "999px", border: `1px solid ${bpCat.color}33` }}>
                  {bpCat.label}
                </span>
              )}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
              Track your blood pressure, sugar & weight over time for smarter consultations.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)"
          }}
        >
          <Plus size={15} />
          Log Today's Vitals
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            fontWeight: "600",
            background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: message.type === "success" ? "#047857" : "#b91c1c",
            border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`
          }}
        >
          {message.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {message.text}
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {/* Latest BP */}
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            Latest BP
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
              {latest ? `${latest.systolic}/${latest.diastolic}` : "--/--"}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>mmHg</span>
          </div>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            {latest ? new Date(latest.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No logs"}
          </span>
        </div>

        {/* 30-Day Avg BP */}
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            30-Day Average
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb" }}>
              {trendData?.metrics?.avgSystolic ? `${trendData.metrics.avgSystolic}/${trendData.metrics.avgDiastolic}` : "--/--"}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>mmHg</span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Based on {trendData?.totalReadings || 0} reading{trendData?.totalReadings !== 1 ? "s" : ""}
          </span>
        </div>

        {/* BP Trend */}
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            Systolic Trend
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {trendDir === "upward" ? (
              <TrendingUp size={18} color="#dc2626" />
            ) : trendDir === "downward" ? (
              <TrendingDown size={18} color="#059669" />
            ) : (
              <Activity size={18} color="#2563eb" />
            )}
            <span
              style={{
                fontSize: "18px",
                fontWeight: "800",
                color: trendDir === "upward" ? "#dc2626" : trendDir === "downward" ? "#059669" : "#2563eb"
              }}
            >
              {trendPercent > 0 ? `+${trendPercent}%` : `${trendPercent}%`}
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            {trendDir === "upward" ? "Trending Higher" : trendDir === "downward" ? "Trending Lower" : "Stable reading"}
          </span>
        </div>

        {/* Blood Sugar */}
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            Blood Sugar (Avg)
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#059669" }}>
              {trendData?.metrics?.avgSugar || (latest?.bloodSugar || "--")}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>mg/dL</span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            {latest?.weight ? `Weight: ${latest.weight} kg` : "Normal range"}
          </span>
        </div>
      </div>

      {/* Recharts Trend Line Graph */}
      <div style={{ background: "#faf5ff", borderRadius: "14px", border: "1px solid #e9d5ff", padding: "16px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", padding: "0 8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "800", color: "#6b21a8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            📈 Blood Pressure & Health Trends Over Time
          </span>
          <span style={{ fontSize: "11px", color: "#7e22ce" }}>
            Weekly Logged Readings
          </span>
        </div>

        {loading ? (
          <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#7e22ce" }}>
            <Loader2 size={20} className="animate-spin" style={{ marginRight: 8 }} />
            Loading vitals history...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: "180px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#6b7280", textAlign: "center" }}>
            <Heart size={30} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>No vitals recorded yet.</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>Click "Log Today's Vitals" above to start tracking your BP & sugar trends.</p>
          </div>
        ) : (
          <div style={{ width: "100%", height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={["dataMin - 15", "dataMax + 15"]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #ddd6fe",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "12px"
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic BP (mmHg)"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#e11d48" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic BP (mmHg)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0284c7" }}
                  activeDot={{ r: 6 }}
                />
                {chartData.some((d) => d.bloodSugar) && (
                  <Line
                    type="monotone"
                    dataKey="bloodSugar"
                    name="Blood Sugar (mg/dL)"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              maxWidth: "460px",
              width: "100%",
              background: "#fff",
              borderRadius: "18px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", padding: "16px 20px", borderBottom: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#1e3a8a" }}>
                  Record New Vitals Entry
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                style={{ background: "transparent", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "18px 20px" }}>
              {/* Quick test presets */}
              <div style={{ marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Quick Presets:
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(120, 80, 105, 72)}
                    style={{ fontSize: "11px", fontWeight: "700", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    ⚡ Normal (120/80)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(136, 88, 115, 73)}
                    style={{ fontSize: "11px", fontWeight: "700", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "3px 8px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    ⚡ Elevated (136/88)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(145, 94, 130, 74)}
                    style={{ fontSize: "11px", fontWeight: "700", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "3px 8px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    ⚡ High (145/94)
                  </button>
                </div>
              </div>

              {/* BP Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Systolic BP (mmHg) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 120"
                    value={form.systolic}
                    onChange={(e) => setForm({ ...form, systolic: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Diastolic BP (mmHg) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 80"
                    value={form.diastolic}
                    onChange={(e) => setForm({ ...form, diastolic: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Sugar & Weight Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 110"
                    value={form.bloodSugar}
                    onChange={(e) => setForm({ ...form, bloodSugar: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 72.5"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning before breakfast, after walk"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "12.5px", boxSizing: "border-box" }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  style={{ padding: "8px 14px", borderRadius: "8px", background: "#f1f5f9", border: "none", color: "#475569", fontSize: "12.5px", fontWeight: "700", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    border: "none",
                    color: "#fff",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Save Reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
