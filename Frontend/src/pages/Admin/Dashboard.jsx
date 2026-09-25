import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Stethoscope,
  Users,
  FileBarChart,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../util/api";

/* ─────────────────────────────────────────────
   Styles injected once into <head>
───────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --ad-blue-950: #0a1628;
    --ad-blue-900: #0f2044;
    --ad-blue-800: #1a3a6e;
    --ad-blue-700: #1e4d99;
    --ad-blue-600: #2563eb;
    --ad-blue-500: #3b82f6;
    --ad-blue-400: #60a5fa;
    --ad-blue-300: #93c5fd;
    --ad-blue-200: #bfdbfe;
    --ad-blue-100: #dbeafe;
    --ad-blue-50:  #eff6ff;
    --ad-white:    #ffffff;
    --ad-gray-50:  #f8fafc;
    --ad-gray-100: #f1f5f9;
    --ad-gray-200: #e2e8f0;
    --ad-gray-400: #94a3b8;
    --ad-gray-500: #64748b;
    --ad-gray-700: #334155;
    --ad-gray-900: #0f172a;
  }

  .ad-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .ad-root h1, .ad-root h2, .ad-root h3, .ad-root .ad-num { font-family: 'Sora', sans-serif; }

  /* Shimmer skeleton */
  @keyframes ad-shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  .ad-skeleton {
    background: linear-gradient(90deg, var(--ad-gray-100) 25%, var(--ad-gray-200) 50%, var(--ad-gray-100) 75%);
    background-size: 800px 100%;
    animation: ad-shimmer 1.4s infinite linear;
    border-radius: 14px;
  }

  /* Fade-up entrance */
  @keyframes ad-fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ad-fade { animation: ad-fadeUp 0.5s cubic-bezier(.22,1,.36,1) both; }
  .ad-d1 { animation-delay: 0.04s; }
  .ad-d2 { animation-delay: 0.10s; }
  .ad-d3 { animation-delay: 0.16s; }
  .ad-d4 { animation-delay: 0.22s; }
  .ad-d5 { animation-delay: 0.28s; }
  .ad-d6 { animation-delay: 0.34s; }

  /* Count-up pulse */
  @keyframes ad-pop {
    0%   { transform: scale(0.8); opacity: 0; }
    70%  { transform: scale(1.06); }
    100% { transform: scale(1);   opacity: 1; }
  }
  .ad-pop { animation: ad-pop 0.5s cubic-bezier(.22,1,.36,1) both; }

  /* Card base */
  .ad-card {
    background: var(--ad-white);
    border-radius: 18px;
    box-shadow: 0 2px 16px rgba(15,32,68,0.07), 0 0 0 1px rgba(15,32,68,0.04);
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .ad-card:hover { box-shadow: 0 8px 32px rgba(15,32,68,0.12); transform: translateY(-2px); }

  /* Stat card icon wrap */
  .ad-icon-wrap {
    width: 56px; height: 56px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .ad-icon-wrap::after {
    content: '';
    position: absolute; inset: 0;
    background: rgba(255,255,255,0.25);
    border-radius: inherit;
  }

  /* Progress bar */
  .ad-bar-bg  { background: var(--ad-gray-100); border-radius: 99px; height: 6px; overflow: hidden; }
  .ad-bar-fill { height: 100%; border-radius: 99px; transition: width 1s ease; }

  /* Activity dot */
  .ad-dot {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }

  /* Header gradient band */
  .ad-header-band {
    background: linear-gradient(135deg, var(--ad-blue-900) 0%, var(--ad-blue-700) 55%, var(--ad-blue-500) 100%);
    border-radius: 20px;
    padding: 36px 40px;
    color: white;
    position: relative;
    overflow: hidden;
    margin-bottom: 28px;
  }
  .ad-header-band::before {
    content: '';
    position: absolute; top: -80px; right: -60px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
  }
  .ad-header-band::after {
    content: '';
    position: absolute; bottom: -50px; left: 60px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%);
  }

  /* Trend badge */
  .ad-trend {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 50px;
  }
  .ad-trend.up   { background: #f0fdf4; color: #15803d; }
  .ad-trend.blue { background: var(--ad-blue-50); color: var(--ad-blue-700); }
`;

function injectStyles() {
  if (document.getElementById("ad-styles")) return;
  const el = document.createElement("style");
  el.id = "ad-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ── Skeleton ── */
function DashboardSkeleton() {
  return (
    <div style={{ padding: "32px 28px", maxWidth: 1280, margin: "0 auto" }}>
      <div className="ad-skeleton" style={{ height: 110, marginBottom: 28 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 24 }}>
        {[1,2,3,4].map(i => <div key={i} className="ad-skeleton" style={{ height: 110 }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div className="ad-skeleton" style={{ height: 320 }} />
        <div className="ad-skeleton" style={{ height: 320 }} />
      </div>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon, title, value, gradient, progress, delay }) {
  return (
    <div className={`ad-card ad-fade ${delay}`} style={{ padding: "24px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div className="ad-icon-wrap" style={{ background: gradient }}>{icon}</div>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ad-gray-500)", margin: "0 0 6px", letterSpacing: 0.3 }}>
        {title}
      </p>
      <p className="ad-num ad-pop" style={{ fontSize: 32, fontWeight: 800, color: "var(--ad-gray-900)", margin: "0 0 14px", letterSpacing: "-0.5px" }}>
        {value}
      </p>
      <div className="ad-bar-bg">
        <div className="ad-bar-fill" style={{ width: `${progress}%`, background: gradient }} />
      </div>
    </div>
  );
}

/* ── Activity item ── */
function ActivityItem({ emoji, bg, text, time, border }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 16, borderBottom: border ? "1px solid var(--ad-gray-100)" : "none", marginBottom: border ? 16 : 0 }}>
      <div className="ad-dot" style={{ background: bg }}>{emoji}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13.5, color: "var(--ad-gray-700)", margin: "0 0 3px", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: text }} />
        <p style={{ fontSize: 11, color: "var(--ad-gray-400)", margin: 0 }}>{time}</p>
      </div>
    </li>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    appointmentsToday: 0,
    monthlyRevenue: 0,
  });
  const [trendCounts, setTrendCounts] = useState(Array(12).fill(0));
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isFetchingRef = useRef(false);

  useEffect(() => { injectStyles(); }, []);

  const fetchStats = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (silent) setIsRefreshing(true);
    try {
      const res = await API.get("/admin/dashboard");
      const data = res.data || {};
      setStats(data.stats || { totalDoctors:0, totalPatients:0, appointmentsToday:0, monthlyRevenue:0 });
      setTrendCounts(Array.isArray(data.trendCounts) ? data.trendCounts : Array(12).fill(0));
      setActivities(Array.isArray(data.activities) ? data.activities : []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
      if (silent) setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const pollId = setInterval(() => {
      fetchStats(true);
    }, 15000);

    const onFocus = () => fetchStats(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchStats(true);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(pollId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="ad-root" style={{ minHeight: "100vh", background: "var(--ad-gray-50)" }}>
        <DashboardSkeleton />
      </div>
    );
  }

  const maxVal = Math.max(stats.totalDoctors, stats.totalPatients, stats.appointmentsToday, stats.monthlyRevenue / 1000, 1);
  const maxTrend = Math.max(...trendCounts, 1);
  const yAxisTicks = [3, 2, 1, 0].map((step) => Math.round((maxTrend * step) / 3));

  return (
    <div className="ad-root" style={{ minHeight: "100vh", background: "var(--ad-gray-50)", padding: "32px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Header Band ── */}
        <div className="ad-header-band ad-fade ad-d1">
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", margin: "0 0 6px" }}>
                Control Panel
              </p>
              <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
                Admin Dashboard
              </h1>
              <p style={{ color: "rgba(255,255,255,0.65)", margin: 0, fontSize: 14 }}>
                System overview and live statistics
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/admin/report")}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 50,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <FileBarChart size={15} />
                📊 Generate Report
              </button>
              <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 500, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={15} />
                System Online
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 500, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={15} />
                {isRefreshing ? "Syncing..." : "Live Data"}
                {lastUpdated && !isRefreshing ? ` • ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 20, marginBottom: 28 }}>
          <StatCard
            icon={<Stethoscope size={24} color="white" />}
            title="Total Doctors"
            value={stats.totalDoctors}
            gradient="linear-gradient(135deg,#1e4d99,#3b82f6)"
            progress={Math.min((stats.totalDoctors / maxVal) * 100, 100)}
            delay="ad-d2"
          />
          <StatCard
            icon={<Users size={24} color="white" />}
            title="Total Patients"
            gradient="linear-gradient(135deg,#0284c7,#38bdf8)"
            value={stats.totalPatients}
            progress={Math.min((stats.totalPatients / maxVal) * 100, 100)}
            delay="ad-d3"
          />
          <StatCard
            icon={<CalendarDays size={24} color="white" />}
            title="Today's Appointments"
            gradient="linear-gradient(135deg,#0ea5e9,#67e8f9)"
            value={stats.appointmentsToday}
            progress={Math.min((stats.appointmentsToday / maxVal) * 100, 100)}
            delay="ad-d4"
          />
          <StatCard
            icon={<FileBarChart size={24} color="white" />}
            title="Total Revenue"
            gradient="linear-gradient(135deg,#1e4d99,#60a5fa)"
            value={`₹${stats.monthlyRevenue.toLocaleString()}`}
            progress={75}
            delay="ad-d5"
          />
        </div>

        {/* ── Bottom Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "stretch" }}>

          {/* Chart placeholder */}
          <div className="ad-card ad-fade ad-d5" style={{ padding: "28px 28px", minHeight: 430, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 19, color: "var(--ad-gray-900)", margin: "0 0 4px" }}>
                  Appointment Trends
                </h2>
                <p style={{ fontSize: 13, color: "var(--ad-gray-400)", margin: 0 }}>Monthly overview</p>
              </div>
              <span className="ad-trend blue">
                <TrendingUp size={12} /> This month
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10, marginBottom: 12, flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", padding: "6px 0 8px" }}>
                {yAxisTicks.map((tick, idx) => (
                  <span key={`${tick}-${idx}`} style={{ fontSize: 10, color: "var(--ad-gray-400)", fontWeight: 700, lineHeight: 1 }}>
                    {tick}
                  </span>
                ))}
              </div>

              <div style={{ position: "relative", borderLeft: "1px solid var(--ad-gray-200)", borderBottom: "2px solid var(--ad-gray-100)", borderRadius: "0 0 8px 0", padding: "8px 10px 0" }}>
                {[25, 50, 75].map((pct) => (
                  <div
                    key={pct}
                    style={{
                      position: "absolute",
                      left: 10,
                      right: 10,
                      bottom: `${pct}%`,
                      borderTop: "1px dashed var(--ad-gray-100)",
                    }}
                  />
                ))}

                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "flex-end", gap: 10 }}>
                  {trendCounts.map((count, i) => {
                    const h = Math.round((count / maxTrend) * 100);
                    const barHeight = count > 0 ? Math.max(h, 8) : 0;
                    const currentMonth = new Date().getMonth();

                    return (
                      <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
                        <div
                          title={`${count} appointments`}
                          style={{
                            width: "100%",
                            height: `${barHeight}%`,
                            background: i === currentMonth
                              ? "linear-gradient(180deg,#3b82f6,#1e4d99)"
                              : "linear-gradient(180deg,var(--ad-blue-200),var(--ad-blue-100))",
                            borderRadius: "8px 8px 0 0",
                            transition: "height 0.8s ease",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10 }}>
              <div />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => (
                  <span key={m} style={{ fontSize: 10, color: "var(--ad-gray-400)", fontWeight: 600 }}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Activity feed */}
          <div className="ad-card ad-fade ad-d6" style={{ padding: "28px 24px", minHeight: 430 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 19, color: "var(--ad-gray-900)", margin: 0 }}>
                Recent Activity
              </h2>
              <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", boxShadow: "0 0 0 3px #dcfce7" }} />
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {activities.slice(0, 5).map((a, idx, arr) => (
                <ActivityItem key={idx} emoji={a.emoji} bg={a.bg} text={a.text} time={a.time} border={idx !== arr.length - 1} />
              ))}
            </ul>

            {/* Mini divider + summary */}
            <div style={{ marginTop: 22, padding: "16px 14px", background: "var(--ad-blue-50)", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--ad-blue-700)", margin: 0 }}>{stats.totalDoctors}</p>
                  <p style={{ fontSize: 11, color: "var(--ad-blue-600)", margin: 0 }}>Doctors</p>
                </div>
                <div style={{ width: 1, background: "var(--ad-blue-100)" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--ad-blue-700)", margin: 0 }}>{stats.totalPatients}</p>
                  <p style={{ fontSize: 11, color: "var(--ad-blue-600)", margin: 0 }}>Patients</p>
                </div>
                <div style={{ width: 1, background: "var(--ad-blue-100)" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--ad-blue-700)", margin: 0 }}>{stats.appointmentsToday}</p>
                  <p style={{ fontSize: 11, color: "var(--ad-blue-600)", margin: 0 }}>Today</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}