import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock, Users, CheckCircle2, AlertTriangle, Loader2,
  ArrowLeft, Activity, Timer, ChevronRight, Zap
} from "lucide-react";
import API from "../util/api";
import { getSocket } from "../../utils/socket";

// ─── Styles ──────────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  .lq-root * { box-sizing: border-box; }
  .lq-root {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f6ff 0%, #e8f0fe 100%);
    padding: 24px 16px 40px;
  }

  /* ── Token badge ── */
  @keyframes tokenPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(26,107,255,.4); }
    50%      { box-shadow: 0 0 0 16px rgba(26,107,255,0); }
  }
  .token-badge {
    width: 120px; height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1a6bff, #4d8dff);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: #fff; animation: tokenPulse 2s infinite;
    box-shadow: 0 8px 32px rgba(26,107,255,.35);
  }
  .token-badge .num { font-size: 48px; font-weight: 800; line-height: 1; }
  .token-badge .lbl { font-size: 11px; font-weight: 600; letter-spacing: .08em; opacity: .85; text-transform: uppercase; }

  /* ── Status cards ── */
  .lq-card {
    background: #fff;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(26,107,255,.08);
    border: 1px solid #e8f0ff;
    margin-bottom: 16px;
  }

  /* ── Banners ── */
  .banner-next {
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    border: 1.5px solid #86efac;
    border-radius: 16px; padding: 18px 22px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 16px;
  }
  .banner-delay {
    background: linear-gradient(135deg, #fff7ed, #fed7aa);
    border: 1.5px solid #fb923c;
    border-radius: 16px; padding: 18px 22px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 16px;
  }
  .banner-serving {
    background: linear-gradient(135deg, #ede9fe, #ddd6fe);
    border: 1.5px solid #a78bfa;
    border-radius: 16px; padding: 18px 22px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 16px;
  }

  /* ── Queue rows ── */
  .q-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .q-row:last-child { border-bottom: none; }
  .q-token {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 700; flex-shrink: 0;
  }
  .q-token-mine    { background: #dbeafe; color: #1d4ed8; border: 2px solid #93c5fd; }
  .q-token-active  { background: #ede9fe; color: #6d28d9; border: 2px solid #c4b5fd; }
  .q-token-wait    { background: #f1f5f9; color: #64748b; border: 2px solid #e2e8f0; }
  .q-token-done    { background: #dcfce7; color: #16a34a; border: 2px solid #86efac; }

  /* ── ETA chip ── */
  .eta-chip {
    display: inline-flex; align-items: center; gap: 4px;
    background: #f0f6ff; color: #1d4ed8;
    border-radius: 999px; padding: 3px 10px;
    font-size: 12px; font-weight: 600;
  }

  /* ── Live dot ── */
  @keyframes liveDot { 0%,100%{opacity:1;} 50%{opacity:.3;} }
  .live-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #22c55e;
    animation: liveDot 1.2s ease infinite;
    display: inline-block;
  }

  /* ── Refresh bar ── */
  @keyframes refillBar {
    from { width: 100%; }
    to   { width: 0%; }
  }
  .refresh-bar {
    height: 3px; border-radius: 999px;
    background: #1a6bff;
    animation: refillBar 60s linear forwards;
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtEta = (min) => {
  if (min === 0) return "Any moment";
  if (min < 60)  return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `~${h}h ${m}m` : `~${h}h`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveQueueDashboard() {
  const { doctorId, date }  = useParams();
  const navigate            = useNavigate();
  const [state, setState]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [myToken, setMyToken] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [barKey, setBarKey] = useState(0); // forces refresh bar restart
  const pollRef = useRef(null);

  // Fetch from REST
  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await API.get(`/queue/${doctorId}/${date}`);
      setState(data);
      setLastUpdated(new Date());
      setBarKey((k) => k + 1);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [doctorId, date]);

  // Resolve the logged-in patient's token
  useEffect(() => {
    try {
      const auth = JSON.parse(localStorage.getItem("auth") || "{}");
      const userId = auth?.user?._id;
      if (state && userId) {
        const mine = state.queue.find(
          (q) => q.patientId?.toString() === userId?.toString()
        );
        if (mine) setMyToken(mine.tokenNumber);
      }
    } catch { /* ignore */ }
  }, [state]);

  // Initial fetch + polling every 60s
  useEffect(() => {
    fetchQueue();
    pollRef.current = setInterval(fetchQueue, 60_000);
    return () => clearInterval(pollRef.current);
  }, [fetchQueue]);

  // Socket listener for real-time pushes
  useEffect(() => {
    const socket = getSocket();

    const handleQueueUpdated = (data) => {
      const matchDoc = data?.doctorId?.toString() === doctorId || data?.doctorIds?.includes(doctorId);
      if (matchDoc && data?.date === date) {
        setState(data);
        setLastUpdated(new Date());
        setBarKey((k) => k + 1);
        // Restart poll timer from now
        clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchQueue, 60_000);
      }
    };

    socket.on("queue_updated", handleQueueUpdated);
    return () => socket.off("queue_updated", handleQueueUpdated);
  }, [doctorId, date, fetchQueue]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="lq-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{STYLE}</style>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <Loader2 size={40} style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
          <p style={{ margin: 0 }}>Loading live queue…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lq-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{STYLE}</style>
        <div className="lq-card" style={{ textAlign: "center", maxWidth: 400 }}>
          <AlertTriangle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
          <p style={{ color: "#ef4444", margin: "0 0 16px" }}>{error}</p>
          <button
            onClick={fetchQueue}
            style={{ padding: "10px 24px", borderRadius: 10, background: "#1a6bff", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { nowServing, isDelayed, delayMinutes, queue, avgDurationMinutes, totalBooked, doneCount } = state || {};
  const myEntry = queue?.find((q) => q.tokenNumber === myToken);
  const isMyTurn = myEntry?.isNext;
  const amInProgress = myEntry?.status === "consultation-started";

  return (
    <div className="lq-root">
      <style>{STYLE}</style>

      {/* ── Top bar ── */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontWeight: 600, fontSize: 14, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft size={18} /> Back to My Appointments
        </button>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e3a5f" }}>
              Live Queue
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              {date} &nbsp;·&nbsp; <span className="live-dot" /> Live updates
            </p>
          </div>
          {/* My Token badge */}
          {myToken && (
            <div className="token-badge">
              <span className="num">#{myToken}</span>
              <span className="lbl">Your Token</span>
            </div>
          )}
        </div>

        {/* ── Refresh progress bar ── */}
        <div style={{ background: "#e8f0ff", borderRadius: 999, height: 3, marginBottom: 20, overflow: "hidden" }}>
          <div key={barKey} className="refresh-bar" />
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Total Booked", value: totalBooked ?? 0, icon: <Users size={16} color="#1a6bff" /> },
            { label: "Completed",    value: doneCount ?? 0,   icon: <CheckCircle2 size={16} color="#16a34a" /> },
            { label: "Avg Duration", value: `${avgDurationMinutes ?? 20} min`, icon: <Timer size={16} color="#f59e0b" /> }
          ].map(({ label, value, icon }) => (
            <div key={label} className="lq-card" style={{ textAlign: "center", padding: "16px 8px", marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a5f" }}>{value}</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── You're next banner ── */}
        {isMyTurn && !amInProgress && (
          <div className="banner-next">
            <Zap size={28} color="#16a34a" />
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#14532d" }}>You're Next!</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#166534" }}>
                Please head to the clinic now. Estimated wait: {fmtEta(myEntry?.etaMinutes ?? 0)}
              </p>
            </div>
          </div>
        )}

        {/* ── You are in consultation banner ── */}
        {amInProgress && (
          <div className="banner-serving">
            <Activity size={28} color="#6d28d9" />
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#4c1d95" }}>You're In Consultation</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#5b21b6" }}>
                Token #{myToken} is currently with the doctor.
              </p>
            </div>
          </div>
        )}

        {/* ── Doctor running late banner ── */}
        {isDelayed && (
          <div className="banner-delay">
            <AlertTriangle size={28} color="#c2410c" />
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#7c2d12" }}>
                Doctor is Running Late
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#9a3412" }}>
                Current consultation has exceeded expected time by ~{delayMinutes} min. ETAs have been adjusted.
              </p>
            </div>
          </div>
        )}

        {/* ── Now Serving ── */}
        {nowServing && (
          <div className="lq-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Activity size={18} color="#6366f1" />
              <span style={{ fontWeight: 700, color: "#1e3a5f", fontSize: 15 }}>Now Serving</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="q-token q-token-active">#{nowServing.tokenNumber}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#1e3a5f", fontSize: 14 }}>
                  {nowServing.patientName}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
                  In consultation · {nowServing.elapsedMin} min elapsed
                </p>
              </div>
              <div>
                <span className="live-dot" />
                <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginLeft: 5 }}>LIVE</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Queue list ── */}
        <div className="lq-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Users size={18} color="#1a6bff" />
            <span style={{ fontWeight: 700, color: "#1e3a5f", fontSize: 15 }}>Waiting Queue</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>
              {queue?.filter((q) => q.status !== "consultation-started").length ?? 0} waiting
            </span>
          </div>

          {!queue || queue.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", margin: "24px 0", fontSize: 14 }}>
              No active patients in queue
            </p>
          ) : (
            queue.map((entry) => {
              const isMine     = entry.tokenNumber === myToken;
              const isInProg   = entry.status === "consultation-started";
              const tokenClass = isMine ? "q-token-mine" : isInProg ? "q-token-active" : "q-token-wait";

              return (
                <div key={entry.appointmentId} className="q-row" style={isMine ? { background: "#f0f6ff", borderRadius: 12, margin: "4px -8px", padding: "12px 8px" } : {}}>
                  <div className={`q-token ${tokenClass}`}>#{entry.tokenNumber}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: isMine ? 700 : 500, fontSize: 14, color: "#1e3a5f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isMine ? "You" : `Token #${entry.tokenNumber}`}
                      {entry.isNext && !isInProg && (
                        <span style={{ marginLeft: 8, fontSize: 11, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>
                          NEXT
                        </span>
                      )}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                      {isInProg ? "In consultation" : entry.status === "arrived" ? "Arrived at clinic" : "Waiting"}
                    </p>
                  </div>

                  {!isInProg && (
                    <span className="eta-chip">
                      <Clock size={11} /> {fmtEta(entry.etaMinutes)}
                    </span>
                  )}

                  {isMine && !isInProg && (
                    <ChevronRight size={16} color="#1a6bff" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── My ETA card ── */}
        {myEntry && !amInProgress && (
          <div className="lq-card" style={{ textAlign: "center", background: "linear-gradient(135deg, #dbeafe, #ede9fe)", border: "1.5px solid #93c5fd" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: "#4338ca", fontWeight: 600 }}>
              Your Estimated Wait
            </p>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: "#1e3a5f" }}>
              {fmtEta(myEntry.etaMinutes)}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
              Based on doctor's historical avg of {avgDurationMinutes} min per patient
            </p>
          </div>
        )}

        {/* ── Last updated ── */}
        {lastUpdated && (
          <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 16 }}>
            Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 60s
          </p>
        )}
      </div>
    </div>
  );
}
