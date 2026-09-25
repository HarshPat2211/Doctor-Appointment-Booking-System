import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Search, Eye, CheckCircle2, XCircle, Trash2, Loader2, Calendar, Clock, X, User, Stethoscope } from "lucide-react";
import API from "../util/api";
import { showToast } from "../../Redux/toastSlice";
import { formatDate } from "../../utils/helpers";

function useLazyReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { threshold });
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, visible];
}
function Reveal({ children, delay = 0, style = {} }) {
  const [ref, v] = useLazyReveal();
  return <div ref={ref} style={{ ...style, opacity:v?1:0, transform:v?"translateY(0)":"translateY(22px)", transition:`opacity .55s ${delay}ms ease,transform .55s ${delay}ms ease` }}>{children}</div>;
}

const statusStyle = (s) => {
  const st = (s||"").toLowerCase();
  if (st==="approved"||st==="confirmed") return { color:"#059669", bg:"#ecfdf5", border:"#a7f3d0" };
  if (st==="cancelled") return { color:"#dc2626", bg:"#fef2f2", border:"#fecaca" };
  if (st==="completed"||st==="consultation-completed") return { color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe" };
  return { color:"#d97706", bg:"#fffbeb", border:"#fde68a" };
};

export default function ManageAppointments() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search,        setSearch]        = useState("");
  const [appointments,  setAppointments]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState({ id:null, type:null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [cancelDialog,  setCancelDialog]  = useState(null);

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await API.get("/appointments/all");
      const list = Array.isArray(res.data) ? res.data : [];
      setAppointments(list.map(a => ({
        id: a._id,
        doctor: a.doctor?.user?.name || "N/A",
        doctorImage: a.doctor?.profileImage || a.doctor?.user?.profileImage || "",
        patient: a.patient?.name || "N/A",
        date: formatDate(a.date, a.date || "N/A"),
        time: a.time || "N/A",
        status: a.status || "pending"
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setActionLoading({ id, type:newStatus });

      if (newStatus === "cancelled") {
        await API.put(`/appointments/${id}/admin-cancel`, { reason: "Cancelled by admin" });
      } else {
        await API.put(`/appointments/${id}/admin-status`, { status:newStatus });
      }

      setAppointments(prev => prev.map(a => a.id===id ? { ...a, status:newStatus } : a));
      dispatch(showToast({ message:`Appointment ${newStatus}!`, type:"success" }));
    } catch { dispatch(showToast({ message:"Failed to update status", type:"error" })); }
    finally { setActionLoading({ id:null, type:null }); }
  };

  const openCancelDialog = (appointment) => {
    setCancelDialog({ id: appointment.id, label: `${appointment.doctor} – ${appointment.patient}`, reason: "" });
  };

  const handleCancelWithReason = async () => {
    if (!cancelDialog?.id) return;
    const reason = String(cancelDialog.reason || "").trim() || "Cancelled by admin";
    try {
      setActionLoading({ id: cancelDialog.id, type: "cancelled" });
      await API.put(`/appointments/${cancelDialog.id}/admin-cancel`, { reason });
      setAppointments(prev => prev.map(a => a.id===cancelDialog.id ? { ...a, status:"cancelled" } : a));
      dispatch(showToast({ message:"Appointment cancelled", type:"success" }));
    } catch {
      dispatch(showToast({ message:"Failed to cancel appointment", type:"error" }));
    } finally {
      setActionLoading({ id:null, type:null });
      setCancelDialog(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      setActionLoading({ id, type:"delete" });
      await API.delete(`/appointments/${id}/admin-delete`, { data: { reason: "Deleted by admin" } });
      setAppointments(prev => prev.filter(a => a.id !== id));
      dispatch(showToast({ message:"Appointment removed", type:"success" }));
    } catch {
      dispatch(showToast({ message:"Failed to delete appointment", type:"error" }));
    }
    finally { setActionLoading({ id:null, type:null }); setDeleteConfirm(null); }
  };

  const filtered = appointments.filter(a =>
    a.doctor.toLowerCase().includes(search.toLowerCase()) ||
    a.patient.toLowerCase().includes(search.toLowerCase()) ||
    a.date.includes(search) || a.time.includes(search)
  );

  const canApprove = (status) => {
    const s = (status || "").toLowerCase();
    return s === "pending" || s === "arrived";
  };

  const canCancel = (status) => {
    const s = (status || "").toLowerCase();
    return !["cancelled", "rejected", "completed", "consultation-completed"].includes(s);
  };

  const canViewDetails = (status) => {
    const s = (status || "").toLowerCase();
    return ["consultation-completed", "completed"].includes(s);
  };

  if (loading) return (
    <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:"44px", height:"44px", borderRadius:"50%", border:"3px solid #dbeafe", borderTopColor:"#2563eb", animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
        <p style={{ color:"#2563eb", fontSize:"14px", fontWeight:"500" }}>Loading appointments...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)", padding:"28px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}} @keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ maxWidth:"1200px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"22px" }}>

        <Reveal delay={0}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"14px" }}>
            <div>
              <h1 style={{ margin:0, fontSize:"22px", fontWeight:"800", color:"#1e3a5f" }}>Manage Appointments</h1>
              <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#64748b" }}>View and manage all doctor appointments</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 16px", borderRadius:"12px", background:"#eff6ff", border:"1px solid #bfdbfe" }}>
              <Calendar size={15} style={{ color:"#2563eb" }}/>
              <span style={{ fontSize:"13px", fontWeight:"700", color:"#2563eb" }}>{appointments.length} Total</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div style={{ background:"#fff", borderRadius:"14px", padding:"16px 18px", border:"1px solid #dbeafe", boxShadow:"0 2px 10px rgba(37,99,235,.06)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 14px", borderRadius:"10px", border:"1px solid #dbeafe", background:"#f8faff" }}>
              <Search size={16} style={{ color:"#60a5fa", flexShrink:0 }}/>
              <input type="text" placeholder="Search by doctor, patient, date or time..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ border:"none", outline:"none", background:"transparent", width:"100%", fontSize:"14px", color:"#1e3a5f", fontFamily:"inherit" }}/>
              {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:0, display:"flex" }}><X size={15}/></button>}
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div style={{ background:"#fff", borderRadius:"18px", border:"1px solid #dbeafe", boxShadow:"0 2px 16px rgba(37,99,235,.07)", overflow:"hidden" }}>
            {/* Table header */}
            <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1.6fr 1fr 1fr 1.2fr 160px", background:"linear-gradient(135deg,#eff6ff,#f8faff)", borderBottom:"1px solid #dbeafe", padding:"12px 20px" }}>
              {["Doctor","Patient","Date","Time","Status","Actions"].map((h,i) => (
                <div key={i} style={{ fontSize:"11px", fontWeight:"700", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", textAlign:i===5?"center":"left" }}>{h}</div>
              ))}
            </div>

            {filtered.length > 0 ? (
              <div>
                {filtered.map((a, i) => {
                  const sc = statusStyle(a.status);
                  const isLoadingApprove = actionLoading.id===a.id && actionLoading.type==="approved";
                  const isLoadingCancel  = actionLoading.id===a.id && actionLoading.type==="cancelled";
                  const isLoadingDelete  = actionLoading.id===a.id && actionLoading.type==="delete";
                  return (
                    <Reveal key={a.id} delay={i*35}>
                      <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1.6fr 1fr 1fr 1.2fr 160px", padding:"13px 20px", borderBottom:i<filtered.length-1?"1px solid #f1f5f9":"none", alignItems:"center", transition:"background .15s" }}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8faff"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"700", fontSize:"12px", flexShrink:0, overflow:"hidden" }}>
                            {a.doctorImage ? (
                              <img src={a.doctorImage} alt={a.doctor} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              (a.doctor || "D").charAt(0)
                            )}
                          </div>
                          <span style={{ fontSize:"13px", fontWeight:"600", color:"#1e3a5f", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.doctor}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <User size={13} style={{ color:"#60a5fa", flexShrink:0 }}/>
                          <span style={{ fontSize:"13px", color:"#475569" }}>{a.patient}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                          <Calendar size={12} style={{ color:"#60a5fa" }}/>
                          <span style={{ fontSize:"13px", color:"#64748b" }}>{a.date}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                          <Clock size={12} style={{ color:"#60a5fa" }}/>
                          <span style={{ fontSize:"13px", color:"#64748b" }}>{a.time}</span>
                        </div>
                        <div>
                          <span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"700", color:sc.color, background:sc.bg, border:`1px solid ${sc.border}`, textTransform:"capitalize" }}>{a.status}</span>
                        </div>
                        <div style={{ display:"flex", gap:"6px", justifyContent:"center" }}>
                          <button title="View" style={{ width:"28px", height:"28px", borderRadius:"8px", border:"1px solid #dbeafe", background: canViewDetails(a.status) ? "#f8faff" : "#f1f5f9", color: canViewDetails(a.status) ? "#2563eb" : "#94a3b8", cursor: canViewDetails(a.status) ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                            onClick={() => { if (canViewDetails(a.status)) navigate(`/admin/appointments/${a.id}`); }}
                            onMouseEnter={e=>{ if (canViewDetails(a.status)) { e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#93c5fd"; } }}
                            onMouseLeave={e=>{ if (canViewDetails(a.status)) { e.currentTarget.style.background="#f8faff";e.currentTarget.style.borderColor="#dbeafe"; } }}>
                            <Eye size={13}/>
                          </button>
                          {canApprove(a.status) && (
                            <button onClick={()=>handleUpdateStatus(a.id,"approved")} disabled={isLoadingApprove} title="Approve"
                              style={{ width:"28px", height:"28px", borderRadius:"8px", border:"1px solid #a7f3d0", background:"#ecfdf5", color:"#059669", cursor:isLoadingApprove?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", opacity:isLoadingApprove?.6:1 }}
                              onMouseEnter={e=>{if(!isLoadingApprove)e.currentTarget.style.background="#d1fae5";}}
                              onMouseLeave={e=>{if(!isLoadingApprove)e.currentTarget.style.background="#ecfdf5";}}>
                              {isLoadingApprove ? <Loader2 size={12} style={{animation:"spin .8s linear infinite"}}/> : <CheckCircle2 size={13}/>}
                            </button>
                          )}
                          {canCancel(a.status) && (
                            <button onClick={()=>openCancelDialog(a)} disabled={isLoadingCancel} title="Cancel"
                              style={{ width:"28px", height:"28px", borderRadius:"8px", border:"1px solid #fecaca", background:"#fef2f2", color:"#ef4444", cursor:isLoadingCancel?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", opacity:isLoadingCancel?.6:1 }}
                              onMouseEnter={e=>{if(!isLoadingCancel)e.currentTarget.style.background="#fee2e2";}}
                              onMouseLeave={e=>{if(!isLoadingCancel)e.currentTarget.style.background="#fef2f2";}}>
                              {isLoadingCancel ? <Loader2 size={12} style={{animation:"spin .8s linear infinite"}}/> : <XCircle size={13}/>}
                            </button>
                          )}
                          <button onClick={()=>setDeleteConfirm({ id:a.id, label:`${a.doctor} – ${a.patient}` })} disabled={isLoadingDelete} title="Delete"
                            style={{ width:"28px", height:"28px", borderRadius:"8px", border:"1px solid #fde68a", background:"#fffbeb", color:"#d97706", cursor:isLoadingDelete?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", opacity:isLoadingDelete?.6:1 }}
                            onMouseEnter={e=>{if(!isLoadingDelete)e.currentTarget.style.background="#fef3c7";}}
                            onMouseLeave={e=>{if(!isLoadingDelete)e.currentTarget.style.background="#fffbeb";}}>
                            {isLoadingDelete ? <Loader2 size={12} style={{animation:"spin .8s linear infinite"}}/> : <Trash2 size={13}/>}
                          </button>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding:"56px 24px", textAlign:"center" }}>
                <Calendar size={32} style={{ color:"#bfdbfe", margin:"0 auto 10px" }}/>
                <p style={{ color:"#94a3b8", fontSize:"14px", margin:0 }}>No appointments found</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div style={{ padding:"12px 20px", borderTop:"1px solid #f1f5f9", background:"#fafcff" }}>
                <p style={{ margin:0, fontSize:"12px", color:"#94a3b8" }}>
                  Showing <strong style={{ color:"#2563eb" }}>{filtered.length}</strong> of <strong style={{ color:"#2563eb" }}>{appointments.length}</strong> appointments
                </p>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ width:"100%", maxWidth:"380px", background:"#fff", borderRadius:"24px", padding:"32px", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,.2)", border:"1px solid #dbeafe", animation:"fadeIn .28s ease" }}>
            <div style={{ width:"60px", height:"60px", borderRadius:"50%", background:"#fef2f2", border:"2px solid #fecaca", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Trash2 size={26} style={{ color:"#ef4444" }}/>
            </div>
            <h2 style={{ margin:"0 0 8px", fontSize:"18px", fontWeight:"800", color:"#1e3a5f" }}>Remove Appointment?</h2>
            <p style={{ margin:"0 0 6px", fontSize:"13px", color:"#1e3a5f", fontWeight:"600" }}>{deleteConfirm.label}</p>
            <p style={{ margin:"0 0 24px", fontSize:"13px", color:"#64748b", lineHeight:1.65 }}>This appointment will be permanently removed.</p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"12px", borderRadius:"12px", border:"1px solid #dbeafe", background:"#f8faff", color:"#64748b", fontWeight:"600", fontSize:"14px", cursor:"pointer", fontFamily:"inherit" }}
                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8faff"}>Cancel</button>
              <button onClick={()=>handleDelete(deleteConfirm.id)} style={{ flex:1, padding:"12px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#ef4444,#f87171)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(239,68,68,.28)" }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {cancelDialog && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ width:"100%", maxWidth:"420px", background:"#fff", borderRadius:"24px", padding:"28px", boxShadow:"0 24px 64px rgba(0,0,0,.2)", border:"1px solid #dbeafe", animation:"fadeIn .28s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
              <div style={{ width:"42px", height:"42px", borderRadius:"12px", background:"#fef2f2", border:"1px solid #fecaca", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <XCircle size={18} style={{ color:"#ef4444" }} />
              </div>
              <div>
                <h2 style={{ margin:"0 0 4px", fontSize:"17px", fontWeight:"800", color:"#1e3a5f" }}>Cancel Appointment</h2>
                <p style={{ margin:0, fontSize:"12px", color:"#64748b" }}>{cancelDialog.label}</p>
              </div>
            </div>
            <p style={{ margin:"8px 0 10px", fontSize:"12px", color:"#64748b" }}>Reason is sent to the patient via email.</p>
            <textarea
              rows={3}
              value={cancelDialog.reason}
              onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Write a short reason (optional)"
              style={{ width:"100%", padding:"10px 12px", borderRadius:"10px", border:"1px solid #dbeafe", background:"#f8faff", fontSize:"13px", color:"#1e3a5f", resize:"vertical", outline:"none", fontFamily:"inherit" }}
            />
            <div style={{ display:"flex", gap:"10px", marginTop:"16px" }}>
              <button onClick={() => setCancelDialog(null)} style={{ flex:1, padding:"11px", borderRadius:"12px", border:"1px solid #dbeafe", background:"#f8faff", color:"#64748b", fontWeight:"600", fontSize:"13px", cursor:"pointer", fontFamily:"inherit" }}>Back</button>
              <button onClick={handleCancelWithReason} style={{ flex:1, padding:"11px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#ef4444,#f87171)", color:"#fff", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(239,68,68,.28)" }}>Cancel Appointment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}