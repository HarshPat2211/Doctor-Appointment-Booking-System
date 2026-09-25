import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { showToast } from '../../Redux/toastSlice';
import {
  Clock, Calendar, Plus, Trash2, Eye, Save,
  CheckCircle2, ChevronRight, X, Loader2,
  Coffee, AlertCircle,
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

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
    <div ref={ref} style={{ ...style, opacity: v?1:0, transform: v?"translateY(0)":"translateY(22px)", transition:`opacity .55s ${delay}ms ease,transform .55s ${delay}ms ease` }}>
      {children}
    </div>
  );
}

/* ─── shared styles ─── */
const INP = { width:"100%", padding:"9px 12px", borderRadius:"10px", border:"1px solid #dbeafe", background:"#f8faff", fontSize:"14px", color:"#1e3a5f", outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color .15s" };
const LBL = { display:"block", fontSize:"11px", fontWeight:"700", color:"#64748b", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.06em" };

const TABS = [
  { key:'weekly',    label:'Weekly Schedule', icon:<Clock size={15}/> },
  { key:'exceptions',label:'Date Exceptions',  icon:<Calendar size={15}/> },
  // { key:'preview',   label:'Preview Slots',    icon:<Eye size={15}/> },
];

/* ─── main ─── */
const DoctorAvailability = () => {
  const dispatch = useDispatch();

  const [availability, setAvailability] = useState({ consultationDuration:40, bufferTime:10, weekly:[], exceptions:[] });
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [activeTab,    setActiveTab]    = useState('weekly');
  const [showModal,    setShowModal]    = useState(false);

  // Exception form
  const [exDate,          setExDate]          = useState('');
  const [exIsUnavailable, setExIsUnavailable] = useState(false);
  const [exStart,         setExStart]         = useState('09:00');
  const [exEnd,           setExEnd]           = useState('17:00');
  const [exHasBreak,      setExHasBreak]      = useState(false);
  const [exBreakStart,    setExBreakStart]    = useState('13:00');
  const [exBreakDuration, setExBreakDuration] = useState(60);

  // Preview
  // const [previewDate,  setPreviewDate]  = useState('');
  // const [previewSlots, setPreviewSlots] = useState([]);
  // const [loadingSlots, setLoadingSlots] = useState(false);

  const token = JSON.parse(localStorage.getItem("auth"))?.token;
  const api = useMemo(() => axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);

  const fetchAvailability = useCallback(async () => {
    try {
      const { data } = await api.get('/doctors/profile');
      let weekly = data.availability?.weekly || [];
      if (!Array.isArray(weekly) || weekly.length === 0) {
        weekly = DAYS.map(day => ({ day, isActive:false, startTime:'09:00', endTime:'17:00', hasBreak:false, breakStart:'13:00', breakDuration:60 }));
      } else {
        weekly = DAYS.map(day => {
          const ex = weekly.find(w => w.day === day);
          return ex || { day, isActive:false, startTime:'09:00', endTime:'17:00', hasBreak:false, breakStart:'13:00', breakDuration:60 };
        });
      }
      setAvailability({ consultationDuration:40, bufferTime:10, weekly, exceptions: data.availability?.exceptions || [] });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/doctors/availability', { availability });
      setShowModal(true);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Failed to save', type:'error' }));
    } finally { setSaving(false); }
  };

  const handleWeeklyChange = (i, field, val) => {
    const w = [...availability.weekly];
    w[i] = { ...w[i], [field]: val };
    setAvailability({ ...availability, weekly: w });
  };

  const addException = () => {
    if (!exDate) return;
    const ex = { date:exDate, isUnavailable:exIsUnavailable, startTime:exStart, endTime:exEnd, hasBreak:exHasBreak, breakStart:exBreakStart, breakDuration:Number(exBreakDuration) };
    const filtered = availability.exceptions.filter(e => e.date !== exDate);
    setAvailability({ ...availability, exceptions: [...filtered, ex] });
    setExDate(''); setExIsUnavailable(false);
    dispatch(showToast({ message:'Exception added — save to apply', type:'info' }));
  };

  const removeException = (date) => setAvailability({ ...availability, exceptions: availability.exceptions.filter(e => e.date !== date) });

  // const fetchPreviewSlots = async () => {
  //   if (!previewDate) return;
  //   setLoadingSlots(true);
  //   try { const { data } = await api.get(`/doctors/slots?date=${previewDate}`); setPreviewSlots(data.slots || []); }
  //   catch (e) { console.error(e); }
  //   finally { setLoadingSlots(false); }
  // };

  const activeDays = availability.weekly.filter(d => d.isActive).length;

  if (loading) return (
    <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:"44px", height:"44px", borderRadius:"50%", border:"3px solid #dbeafe", borderTopColor:"#2563eb", animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
        <p style={{ color:"#2563eb", fontSize:"14px", fontWeight:"500" }}>Loading availability...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)", padding:"28px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}} @keyframes fadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

      <div style={{ maxWidth:"900px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"22px" }}>

        {/* ── HEADER ── */}
        <Reveal delay={0}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"14px" }}>
            <div>
              <h1 style={{ margin:0, fontSize:"22px", fontWeight:"800", color:"#1e3a5f" }}>Availability Settings</h1>
              <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#64748b" }}>
                {activeDays} day{activeDays!==1?"s":""} active this week
              </p>
            </div>
            <button onClick={handleSave} disabled={saving} style={{ padding:"11px 24px", borderRadius:"12px", border:"none", background:saving?"#93c5fd":"linear-gradient(135deg,#2563eb,#38bdf8)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:saving?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:"8px", fontFamily:"inherit", boxShadow:saving?"none":"0 6px 20px rgba(37,99,235,.28)", transition:"all .2s" }}
              onMouseEnter={e=>{if(!saving)e.currentTarget.style.boxShadow="0 8px 26px rgba(37,99,235,.4)";}}
              onMouseLeave={e=>{if(!saving)e.currentTarget.style.boxShadow="0 6px 20px rgba(37,99,235,.28)";}}>
              {saving?<><Loader2 size={16} style={{animation:"spin .8s linear infinite"}}/>Saving...</>:<><Save size={16}/>Save Changes</>}
            </button>
          </div>
        </Reveal>

        {/* ── INFO BAR ── */}
        {/* <Reveal delay={60}>
          <div style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius:"14px", padding:"16px 22px", border:"1px solid #bfdbfe", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
            <div>
              <p style={{ margin:0, fontSize:"13px", fontWeight:"700", color:"#1e3a5f" }}>Standard Appointment Rules</p>
              <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#3b5a8a" }}>
                Consultation: <strong>40 mins</strong> &nbsp;·&nbsp; Buffer: <strong>10 mins</strong> &nbsp;·&nbsp; Total Slot: <strong>50 mins</strong>
              </p>
            </div>
            <span style={{ padding:"5px 12px", borderRadius:"20px", fontSize:"11px", fontWeight:"700", color:"#2563eb", background:"#fff", border:"1px solid #bfdbfe" }}>Fixed System Setting</span>
          </div>
        </Reveal> */}

        {/* ── TABS ── */}
        <Reveal delay={100}>
          <div style={{ background:"#fff", borderRadius:"18px", border:"1px solid #dbeafe", boxShadow:"0 2px 12px rgba(37,99,235,.06)", overflow:"hidden" }}>

            {/* Tab bar */}
            <div style={{ display:"flex", borderBottom:"1px solid #dbeafe" }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex:1, padding:"14px 8px", border:"none", background:activeTab===t.key?"#eff6ff":"transparent", color:activeTab===t.key?"#2563eb":"#64748b", fontWeight:activeTab===t.key?"700":"500", fontSize:"13px", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", borderBottom:activeTab===t.key?"2px solid #2563eb":"2px solid transparent", transition:"all .18s" }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            <div style={{ padding:"24px" }}>

              {/* ══ WEEKLY TAB ══ */}
              {activeTab==='weekly'&&(
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {availability.weekly.map((day, i) => (
                    <Reveal key={day.day} delay={i*50}>
                      <div style={{ borderRadius:"14px", border:day.isActive?"1px solid #bfdbfe":"1px solid #e2e8f0", background:day.isActive?"#fff":"#f8faff", padding:"16px 18px", transition:"all .2s" }}>

                        {/* Day row */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                            {/* Toggle */}
                            <button type="button" onClick={()=>handleWeeklyChange(i,'isActive',!day.isActive)} style={{ width:"44px", height:"24px", borderRadius:"12px", background:day.isActive?"linear-gradient(135deg,#2563eb,#38bdf8)":"#e2e8f0", border:"none", cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0, padding:0 }}>
                              <span style={{ position:"absolute", top:"3px", left:day.isActive?"22px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,.15)", transition:"left .2s" }}/>
                            </button>
                            <span style={{ fontSize:"14px", fontWeight:"700", color:day.isActive?"#1e3a5f":"#94a3b8", width:"96px" }}>{day.day}</span>
                          </div>

                          {day.isActive&&(
                            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                              <input type="time" value={day.startTime} onChange={e=>handleWeeklyChange(i,'startTime',e.target.value)}
                                style={{ ...INP, width:"120px" }}
                                onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                              <span style={{ fontSize:"13px", color:"#94a3b8", fontWeight:"500" }}>to</span>
                              <input type="time" value={day.endTime} onChange={e=>handleWeeklyChange(i,'endTime',e.target.value)}
                                style={{ ...INP, width:"120px" }}
                                onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                            </div>
                          )}
                        </div>

                        {/* Break row */}
                        {day.isActive&&(
                          <div style={{ marginTop:"12px", paddingTop:"12px", borderTop:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
                            <label style={{ display:"flex", alignItems:"center", gap:"7px", cursor:"pointer" }}>
                              <button type="button" onClick={()=>handleWeeklyChange(i,'hasBreak',!day.hasBreak)} style={{ width:"36px", height:"20px", borderRadius:"10px", background:day.hasBreak?"linear-gradient(135deg,#0891b2,#38bdf8)":"#e2e8f0", border:"none", cursor:"pointer", position:"relative", transition:"background .2s", padding:0, flexShrink:0 }}>
                                <span style={{ position:"absolute", top:"2px", left:day.hasBreak?"17px":"2px", width:"16px", height:"16px", borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.15)", transition:"left .2s" }}/>
                              </button>
                              <Coffee size={14} style={{ color:day.hasBreak?"#0891b2":"#94a3b8" }}/>
                              <span style={{ fontSize:"13px", color:day.hasBreak?"#1e3a5f":"#94a3b8", fontWeight:"500" }}>Break</span>
                            </label>
                            {day.hasBreak&&(
                              <>
                                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                  <span style={{ fontSize:"12px", color:"#64748b" }}>Start:</span>
                                  <input type="time" value={day.breakStart} onChange={e=>handleWeeklyChange(i,'breakStart',e.target.value)}
                                    style={{ ...INP, width:"130px" }}
                                    onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                  <span style={{ fontSize:"12px", color:"#64748b" }}>Duration:</span>
                                  <input type="number" value={day.breakDuration} onChange={e=>handleWeeklyChange(i,'breakDuration',Number(e.target.value))}
                                    style={{ ...INP, width:"80px" }}
                                    onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                                  <span style={{ fontSize:"12px", color:"#64748b" }}>min</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}

              {/* ══ EXCEPTIONS TAB ══ */}
              {activeTab==='exceptions'&&(
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:"24px", alignItems:"start" }}>

                  {/* Add form */}
                  <Reveal delay={0}>
                    <div style={{ background:"linear-gradient(135deg,#f8faff,#eff6ff)", borderRadius:"14px", padding:"20px", border:"1px solid #dbeafe" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
                        <Plus size={15} style={{ color:"#2563eb" }}/>
                        <h3 style={{ margin:0, fontSize:"14px", fontWeight:"700", color:"#1e3a5f" }}>Add Exception</h3>
                      </div>

                      <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                        <div>
                          <label style={LBL}>Date</label>
                          <input type="date" value={exDate} onChange={e=>setExDate(e.target.value)} style={INP}
                            onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                        </div>

                        {/* Unavailable toggle */}
                        <label style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", padding:"10px 12px", borderRadius:"10px", border:"1px solid #dbeafe", background:exIsUnavailable?"#fef2f2":"#fff" }}>
                          <button type="button" onClick={()=>setExIsUnavailable(!exIsUnavailable)} style={{ width:"40px", height:"22px", borderRadius:"11px", background:exIsUnavailable?"#ef4444":"#e2e8f0", border:"none", cursor:"pointer", position:"relative", padding:0, transition:"background .2s", flexShrink:0 }}>
                            <span style={{ position:"absolute", top:"3px", left:exIsUnavailable?"20px":"3px", width:"16px", height:"16px", borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.15)", transition:"left .2s" }}/>
                          </button>
                          <span style={{ fontSize:"13px", fontWeight:"600", color:exIsUnavailable?"#dc2626":"#334155" }}>Day Off / Unavailable</span>
                        </label>

                        {!exIsUnavailable&&(
                          <>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                              <div>
                                <label style={LBL}>Start</label>
                                <input type="time" value={exStart} onChange={e=>setExStart(e.target.value)} style={INP}
                                  onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                              </div>
                              <div>
                                <label style={LBL}>End</label>
                                <input type="time" value={exEnd} onChange={e=>setExEnd(e.target.value)} style={INP}
                                  onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                              </div>
                            </div>

                            <div style={{ borderTop:"1px solid #dbeafe", paddingTop:"12px" }}>
                              <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", marginBottom:"10px" }}>
                                <button type="button" onClick={()=>setExHasBreak(!exHasBreak)} style={{ width:"36px", height:"20px", borderRadius:"10px", background:exHasBreak?"linear-gradient(135deg,#0891b2,#38bdf8)":"#e2e8f0", border:"none", cursor:"pointer", position:"relative", padding:0, transition:"background .2s", flexShrink:0 }}>
                                  <span style={{ position:"absolute", top:"2px", left:exHasBreak?"17px":"2px", width:"16px", height:"16px", borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.15)", transition:"left .2s" }}/>
                                </button>
                                <Coffee size={13} style={{ color:exHasBreak?"#0891b2":"#94a3b8" }}/>
                                <span style={{ fontSize:"13px", fontWeight:"500", color:"#334155" }}>Add Break</span>
                              </label>
                              {exHasBreak&&(
                                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                                  <div>
                                    <label style={LBL}>Break Start</label>
                                    <input type="time" value={exBreakStart} onChange={e=>setExBreakStart(e.target.value)} style={INP}
                                      onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                                  </div>
                                  <div>
                                    <label style={LBL}>Duration (min)</label>
                                    <input type="number" value={exBreakDuration} onChange={e=>setExBreakDuration(Number(e.target.value))} style={INP}
                                      onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <button onClick={addException} disabled={!exDate} style={{ width:"100%", padding:"11px", borderRadius:"10px", border:"none", background:!exDate?"#e2e8f0":"linear-gradient(135deg,#2563eb,#38bdf8)", color:!exDate?"#94a3b8":"#fff", fontWeight:"700", fontSize:"14px", cursor:!exDate?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", fontFamily:"inherit", boxShadow:!exDate?"none":"0 4px 14px rgba(37,99,235,.25)", transition:"all .15s" }}>
                          <Plus size={15}/> Add Exception
                        </button>
                      </div>
                    </div>
                  </Reveal>

                  {/* Exception list */}
                  <Reveal delay={80}>
                    <div>
                      <h3 style={{ margin:"0 0 14px", fontSize:"14px", fontWeight:"700", color:"#1e3a5f" }}>
                        Scheduled Exceptions ({availability.exceptions.length})
                      </h3>
                      {availability.exceptions.length===0?(
                        <div style={{ padding:"32px", textAlign:"center", background:"#f8faff", borderRadius:"14px", border:"1px solid #dbeafe" }}>
                          <Calendar size={28} style={{ color:"#bfdbfe", margin:"0 auto 10px" }}/>
                          <p style={{ color:"#94a3b8", fontSize:"13px", margin:0 }}>No exceptions added yet</p>
                        </div>
                      ):(
                        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                          {[...availability.exceptions].sort((a,b)=>new Date(a.date)-new Date(b.date)).map((ex,i)=>(
                            <Reveal key={ex.date} delay={i*40}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderRadius:"12px", border:"1px solid #dbeafe", background:"#fff", gap:"10px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                                  <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:ex.isUnavailable?"#ef4444":"#059669", flexShrink:0 }}/>
                                  <div>
                                    <p style={{ margin:0, fontSize:"13px", fontWeight:"700", color:"#1e3a5f" }}>{new Date(ex.date+'T00:00').toDateString()}</p>
                                    <p style={{ margin:"2px 0 0", fontSize:"12px", color:"#64748b" }}>
                                      {ex.isUnavailable?"Unavailable (Day Off)":`${ex.startTime} – ${ex.endTime}${ex.hasBreak?` · Break ${ex.breakStart} for ${ex.breakDuration}m`:""}`}
                                    </p>
                                  </div>
                                </div>
                                <span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"700", color:ex.isUnavailable?"#dc2626":"#059669", background:ex.isUnavailable?"#fef2f2":"#ecfdf5", border:ex.isUnavailable?"1px solid #fecaca":"1px solid #a7f3d0", flexShrink:0 }}>
                                  {ex.isUnavailable?"Off":"Working"}
                                </span>
                                <button onClick={()=>removeException(ex.date)} style={{ width:"28px", height:"28px", borderRadius:"50%", border:"1px solid #fecaca", background:"#fef2f2", color:"#ef4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background .15s" }}
                                  onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"}
                                  onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}>
                                  <Trash2 size={13}/>
                                </button>
                              </div>
                            </Reveal>
                          ))}
                        </div>
                      )}
                    </div>
                  </Reveal>
                </div>
              )}

              {/* ══ PREVIEW TAB ══ */}
              {/* {activeTab==='preview'&&(
                <Reveal delay={0}>
                  <div>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:"12px", marginBottom:"24px", flexWrap:"wrap" }}>
                      <div>
                        <label style={LBL}>Select Date to Preview</label>
                        <input type="date" value={previewDate} onChange={e=>setPreviewDate(e.target.value)} style={{ ...INP, width:"200px" }}
                          onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                      </div>
                      <button onClick={fetchPreviewSlots} disabled={!previewDate||loadingSlots} style={{ padding:"10px 22px", borderRadius:"10px", border:"none", background:!previewDate?"#e2e8f0":"linear-gradient(135deg,#2563eb,#38bdf8)", color:!previewDate?"#94a3b8":"#fff", fontWeight:"700", fontSize:"14px", cursor:!previewDate?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:"7px", fontFamily:"inherit", boxShadow:previewDate?"0 4px 14px rgba(37,99,235,.25)":"none", transition:"all .15s" }}>
                        {loadingSlots?<><Loader2 size={15} style={{animation:"spin .8s linear infinite"}}/>Generating...</>:<><Eye size={15}/>Check Slots</>}
                      </button>
                    </div>

                    {loadingSlots?(
                      <div style={{ textAlign:"center", padding:"32px", color:"#94a3b8", fontSize:"13px" }}>Generating available slots...</div>
                    ):previewSlots.length>0?(
                      <>
                        <p style={{ margin:"0 0 12px", fontSize:"13px", color:"#64748b", fontWeight:"500" }}>{previewSlots.length} slots available</p>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))", gap:"8px" }}>
                          {previewSlots.map(slot=>(
                            <div key={slot} style={{ padding:"10px 8px", background:"linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius:"10px", border:"1px solid #bfdbfe", textAlign:"center", fontSize:"13px", fontWeight:"600", color:"#2563eb" }}>
                              {slot}
                            </div>
                          ))}
                        </div>
                      </>
                    ):previewDate?(
                      <div style={{ textAlign:"center", padding:"32px", background:"#f8faff", borderRadius:"14px", border:"1px solid #dbeafe" }}>
                        <AlertCircle size={28} style={{ color:"#bfdbfe", margin:"0 auto 10px" }}/>
                        <p style={{ color:"#94a3b8", fontSize:"13px", margin:0 }}>No slots available for this date</p>
                      </div>
                    ):null}
                  </div>
                </Reveal>
              )} */}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ══ SUCCESS MODAL ══ */}
      {showModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ width:"100%", maxWidth:"400px", background:"#fff", borderRadius:"24px", padding:"36px 32px", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,.2)", border:"1px solid #dbeafe", animation:"fadeIn .3s ease" }}>
            <div style={{ width:"68px", height:"68px", borderRadius:"50%", background:"linear-gradient(135deg,#ecfdf5,#d1fae5)", border:"2px solid #a7f3d0", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", boxShadow:"0 6px 20px rgba(5,150,105,.15)" }}>
              <CheckCircle2 size={34} style={{ color:"#059669" }}/>
            </div>
            <h2 style={{ margin:"0 0 8px", fontSize:"20px", fontWeight:"800", color:"#1e3a5f" }}>Availability Saved!</h2>
            <p style={{ margin:"0 0 24px", fontSize:"14px", color:"#64748b", lineHeight:1.65 }}>
              Your schedule has been updated. Patients can now book appointments based on your new availability.
            </p>
            <div style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius:"12px", padding:"12px 16px", border:"1px solid #bfdbfe", marginBottom:"24px", textAlign:"left" }}>
              <p style={{ margin:"0 0 4px", fontSize:"12px", fontWeight:"600", color:"#1e3a5f" }}>Active this week</p>
              <p style={{ margin:0, fontSize:"20px", fontWeight:"800", color:"#2563eb" }}>
                {activeDays} <span style={{ fontSize:"13px", fontWeight:"500", color:"#64748b" }}>day{activeDays!==1?"s":""} scheduled</span>
              </p>
            </div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={()=>setShowModal(false)} style={{ flex:2, padding:"12px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#2563eb,#38bdf8)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(37,99,235,.3)" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAvailability;