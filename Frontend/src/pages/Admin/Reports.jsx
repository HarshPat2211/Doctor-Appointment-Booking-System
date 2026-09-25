import React, { useRef, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Stethoscope, Users, Calendar, IndianRupee, TrendingUp, BarChart2 } from "lucide-react";
import API from "../util/api";

/* ─── lazy reveal ─── */
function useLazyReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { threshold }
    );
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, visible];
}
function Reveal({ children, delay = 0, style = {} }) {
  const [ref, v] = useLazyReveal();
  return (
    <div ref={ref} style={{ ...style, opacity:v?1:0, transform:v?"translateY(0)":"translateY(22px)", transition:`opacity .55s ${delay}ms ease,transform .55s ${delay}ms ease` }}>
      {children}
    </div>
  );
}

const PIE_COLORS = ["#2563eb", "#38bdf8", "#0891b2"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toMonthKey = (dateLike) => {
  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

const toMonthLabel = (monthKey) => {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;
  return `${MONTHS[monthIndex] || "-"} ${year}`;
};

const formatINR = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const REVENUE_EXCLUDED_STATUSES = new Set(["cancelled", "rejected", "no-show"]);

const getValidAppointmentDate = (appointment) => {
  if (appointment?.date) {
    const fromDateField = new Date(appointment.date);
    if (!Number.isNaN(fromDateField.getTime())) return fromDateField;
  }
  if (appointment?.createdAt) {
    const fromCreatedAt = new Date(appointment.createdAt);
    if (!Number.isNaN(fromCreatedAt.getTime())) return fromCreatedAt;
  }
  return null;
};

/* ─── custom tooltip ─── */
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #dbeafe", borderRadius:"10px", padding:"10px 14px", boxShadow:"0 8px 24px rgba(37,99,235,.12)", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <p style={{ margin:0, fontSize:"12px", color:"#64748b", fontWeight:"600" }}>{label}</p>
      <p style={{ margin:"4px 0 0", fontSize:"15px", fontWeight:"800", color:"#2563eb" }}>{payload[0].value} appointments</p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #dbeafe", borderRadius:"10px", padding:"10px 14px", boxShadow:"0 8px 24px rgba(37,99,235,.12)", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <p style={{ margin:0, fontSize:"12px", color:"#64748b", fontWeight:"600" }}>{payload[0].name}</p>
      <p style={{ margin:"4px 0 0", fontSize:"15px", fontWeight:"800", color:"#2563eb" }}>₹{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

/* ─── main ─── */
export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
  });
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [rangeLabel, setRangeLabel] = useState("Live Data");
  
  

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      setError("");

      try {
        const [doctorsRes, patientsRes, appointmentsRes] = await Promise.all([
          API.get("/admin/doctors"),
          API.get("/admin/patients"),
          API.get("/appointments/all"),
        ]);

        const doctors = Array.isArray(doctorsRes.data) ? doctorsRes.data : [];
        const patients = Array.isArray(patientsRes.data) ? patientsRes.data : [];
        const appointments = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];

        const revenueAppointments = appointments.filter((item) => {
          const status = String(item?.status || "").toLowerCase();
          return !REVENUE_EXCLUDED_STATUSES.has(status);
        });

        const totalRevenue = revenueAppointments.reduce((sum, item) => sum + Number(item?.fees || 0), 0);

        setStats({
          totalDoctors: doctors.length,
          totalPatients: patients.length,
          totalAppointments: appointments.length,
          totalRevenue,
        });

        const byMonth = new Map();
        revenueAppointments.forEach((item) => {
          const validDate = getValidAppointmentDate(item);
          if (!validDate) return;
          const monthKey = toMonthKey(validDate);
          if (!monthKey) return;
          byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + 1);
        });

        const monthEntries = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        const lastSixMonths = monthEntries.slice(-6);
        const monthlyAppointments = lastSixMonths.map(([monthKey, count]) => ({
          month: toMonthLabel(monthKey),
          count,
        }));
        setAppointmentsData(monthlyAppointments);

        if (lastSixMonths.length > 0) {
          setRangeLabel(`${toMonthLabel(lastSixMonths[0][0])} to ${toMonthLabel(lastSixMonths[lastSixMonths.length - 1][0])}`);
        } else {
          setRangeLabel("No appointment history");
        }

        const statusRevenueMap = new Map();
        appointments.forEach((item) => {
          const status = String(item?.status || "other").toLowerCase();
          const bucket =
            status === "completed" || status === "consultation-completed"
              ? "Completed"
              : status === "approved" || status === "arrived" || status === "consultation-started"
                ? "Active"
                : status === "pending" || status === "rescheduled"
                  ? "Pending"
                  : "Other";

          statusRevenueMap.set(bucket, (statusRevenueMap.get(bucket) || 0) + Number(item?.fees || 0));
        });

        const computedRevenue = [
          { name: "Completed", value: statusRevenueMap.get("Completed") || 0 },
          { name: "Active", value: statusRevenueMap.get("Active") || 0 },
          { name: "Pending", value: statusRevenueMap.get("Pending") || 0 },
        ].filter((item) => item.value > 0);

        setRevenueData(computedRevenue.length > 0 ? computedRevenue : [{ name: "No Revenue", value: 1 }]);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  const statCards = [
    { label:"Total Doctors", value:String(stats.totalDoctors), icon:<Stethoscope size={18}/>, color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe" },
    { label:"Total Patients", value:String(stats.totalPatients), icon:<Users size={18}/>, color:"#0891b2", bg:"#ecfeff", border:"#a5f3fc" },
    { label:"Appointments", value:stats.totalAppointments.toLocaleString("en-IN"), icon:<Calendar size={18}/>, color:"#059669", bg:"#ecfdf5", border:"#a7f3d0" },
    { label:"Revenue", value:formatINR(stats.totalRevenue), icon:<IndianRupee size={18}/>, color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"50%", border:"3px solid #dbeafe", borderTopColor:"#2563eb", animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
          <p style={{ color:"#2563eb", fontSize:"14px", fontWeight:"500" }}>Loading report data...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)", padding:"28px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"24px" }}>

        {/* ── HEADER ── */}
        <Reveal delay={0}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"38px", height:"38px", borderRadius:"10px", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", boxShadow:"0 4px 12px rgba(37,99,235,.25)" }}>
                <BarChart2 size={18}/>
              </div>
              <div>
                <h1 style={{ margin:0, fontSize:"22px", fontWeight:"800", color:"#1e3a5f" }}>Reports</h1>
                <p style={{ margin:0, fontSize:"12px", color:"#64748b" }}>Analytics and performance metrics</p>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 14px", borderRadius:"12px", background:"#eff6ff", border:"1px solid #bfdbfe" }}>
                <TrendingUp size={14} style={{ color:"#2563eb" }}/>
                <span style={{ fontSize:"12px", fontWeight:"700", color:"#2563eb" }}>{rangeLabel}</span>
              </div>
              
              {/* Generate Report removed from admin portal */}
            </div>
          </div>
        </Reveal>

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#b91c1c", borderRadius:"12px", padding:"10px 12px", fontSize:"13px", fontWeight:"600" }}>
            {error}
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"16px" }}>
          {statCards.map((s, i) => (
            <Reveal key={i} delay={i*70}>
              <div style={{ background:"#fff", borderRadius:"16px", padding:"20px", border:`1px solid ${s.border}`, boxShadow:"0 2px 12px rgba(37,99,235,.06)", display:"flex", alignItems:"center", gap:"14px" }}>
                <div style={{ width:"46px", height:"46px", borderRadius:"12px", background:s.bg, border:`1px solid ${s.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:s.color, flexShrink:0 }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ margin:0, fontSize:"11px", color:"#94a3b8", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</p>
                  <p style={{ margin:"4px 0 0", fontSize:"24px", fontWeight:"800", color:"#1e3a5f" }}>{s.value}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── CHARTS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(440px,1fr))", gap:"20px" }}>

          {/* Bar Chart */}
          <Reveal delay={100}>
            <div style={{ background:"#fff", borderRadius:"18px", padding:"24px", border:"1px solid #dbeafe", boxShadow:"0 2px 16px rgba(37,99,235,.07)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"20px" }}>
                <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#eff6ff", border:"1px solid #bfdbfe", display:"flex", alignItems:"center", justifyContent:"center", color:"#2563eb" }}>
                  <BarChart2 size={14}/>
                </div>
                <h2 style={{ margin:0, fontSize:"15px", fontWeight:"700", color:"#1e3a5f" }}>Monthly Appointments</h2>
              </div>
              {appointmentsData.length === 0 ? (
                <div style={{ height:"280px", display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:"13px", fontWeight:"600" }}>
                  No appointment trend data found
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={appointmentsData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f7ff" vertical={false}/>
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize:12, fontFamily:"'DM Sans',sans-serif", fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
                    <YAxis stroke="#94a3b8" tick={{ fontSize:12, fontFamily:"'DM Sans',sans-serif", fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomBarTooltip/>} cursor={{ fill:"#f0f7ff", radius:8 }}/>
                    <Bar dataKey="count" radius={[10,10,0,0]}>
                      {appointmentsData.map((_, i) => (
                        <Cell key={i} fill={i===appointmentsData.length - 1?"#2563eb":`url(#blueGrad${i})`}/>
                      ))}
                    </Bar>
                    <defs>
                      {appointmentsData.map((_, i) => (
                        <linearGradient key={i} id={`blueGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8"/>
                          <stop offset="100%" stopColor="#2563eb"/>
                        </linearGradient>
                      ))}
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Reveal>

          {/* Pie Chart */}
          <Reveal delay={160}>
            <div style={{ background:"#fff", borderRadius:"18px", padding:"24px", border:"1px solid #dbeafe", boxShadow:"0 2px 16px rgba(37,99,235,.07)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"20px" }}>
                <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#eff6ff", border:"1px solid #bfdbfe", display:"flex", alignItems:"center", justifyContent:"center", color:"#2563eb" }}>
                  <IndianRupee size={14}/>
                </div>
                <h2 style={{ margin:0, fontSize:"15px", fontWeight:"700", color:"#1e3a5f" }}>Revenue Breakdown</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {PIE_COLORS.map((c, i) => (
                      <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.9}/>
                        <stop offset="100%" stopColor={c} stopOpacity={0.6}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={revenueData} cx="50%" cy="46%" outerRadius={100} innerRadius={52} dataKey="value" paddingAngle={4}>
                    {revenueData.map((_, i) => (
                      <Cell key={i} fill={`url(#pieGrad${i % PIE_COLORS.length})`} stroke="none"/>
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip/>}/>
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    formatter={(v) => <span style={{ fontSize:"13px", color:"#475569", fontFamily:"'DM Sans',sans-serif" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Revenue legend with values */}
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"8px" }}>
                {revenueData.map((r, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:"10px", background:`${PIE_COLORS[i % PIE_COLORS.length]}11`, border:`1px solid ${PIE_COLORS[i % PIE_COLORS.length]}33` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <span style={{ width:"10px", height:"10px", borderRadius:"50%", background:PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }}/>
                      <span style={{ fontSize:"13px", color:"#475569", fontWeight:"500" }}>{r.name}</span>
                    </div>
                    <span style={{ fontSize:"13px", fontWeight:"800", color:PIE_COLORS[i % PIE_COLORS.length] }}>{formatINR(r.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}