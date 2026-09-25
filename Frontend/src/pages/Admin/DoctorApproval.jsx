import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../Redux/toastSlice";
import API from "../util/api";
import { formatDate } from "../../utils/helpers";
import {
  CheckCircle2, XCircle, Eye, EyeOff, Clock,
  Stethoscope, X, Loader2, AlertTriangle,
} from "lucide-react";

/* ─────────────────────────────────────
   CSS injected once
───────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  :root {
    --da-blue-900:#0f2044;--da-blue-700:#1e4d99;--da-blue-600:#2563eb;
    --da-blue-500:#3b82f6;--da-blue-400:#60a5fa;--da-blue-300:#93c5fd;
    --da-blue-100:#dbeafe;--da-blue-50:#eff6ff;
    --da-gray-50:#f8fafc;--da-gray-100:#f1f5f9;--da-gray-200:#e2e8f0;
    --da-gray-400:#94a3b8;--da-gray-500:#64748b;--da-gray-700:#334155;--da-gray-900:#0f172a;
  }
  .da-root * { font-family:'DM Sans',sans-serif; box-sizing:border-box; }
  .da-root h1,.da-root h2,.da-root h3 { font-family:'Sora',sans-serif; }

  @keyframes da-shimmer { 0%{background-position:-800px 0} 100%{background-position:800px 0} }
  .da-skeleton {
    background:linear-gradient(90deg,var(--da-gray-100) 25%,var(--da-gray-200) 50%,var(--da-gray-100) 75%);
    background-size:800px 100%; animation:da-shimmer 1.4s infinite linear; border-radius:14px;
  }
  @keyframes da-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  .da-fade{animation:da-fadeUp 0.5s cubic-bezier(.22,1,.36,1) both}
  .da-d1{animation-delay:.04s}.da-d2{animation-delay:.10s}.da-d3{animation-delay:.16s}

  .da-header-band {
    background:linear-gradient(135deg,var(--da-blue-900) 0%,var(--da-blue-700) 55%,var(--da-blue-500) 100%);
    border-radius:20px; padding:34px 38px; color:white; position:relative; overflow:hidden; margin-bottom:28px;
  }
  .da-header-band::before {
    content:''; position:absolute; top:-70px; right:-60px;
    width:280px; height:280px;
    background:radial-gradient(circle,rgba(255,255,255,.07) 0%,transparent 70%);
  }
  .da-request-card {
    background:var(--da-white,#fff); border-radius:16px; padding:24px;
    border-left:4px solid var(--da-blue-400);
    box-shadow:0 2px 14px rgba(15,32,68,.07),0 0 0 1px rgba(15,32,68,.04);
    transition:box-shadow .2s,transform .2s;
  }
  .da-request-card:hover{box-shadow:0 6px 24px rgba(15,32,68,.12);transform:translateY(-1px)}
  .da-badge-pending {
    display:inline-flex;align-items:center;gap:6px;
    background:#fefce8;color:#854d0e;border:1px solid #fef08a;
    border-radius:50px;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:.3px;
  }
  .da-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin:16px 0}
  .da-meta-item{font-size:13px}
  .da-meta-label{color:var(--da-gray-400);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px}
  .da-meta-value{color:var(--da-gray-900);font-weight:600}
  .da-btn {
    display:inline-flex;align-items:center;justify-content:center;gap:7px;
    padding:10px 16px;border-radius:10px;font-weight:600;font-size:13px;
    border:none;cursor:pointer;transition:transform .15s,box-shadow .15s,opacity .15s;
    font-family:'DM Sans',sans-serif;
  }
  .da-btn:hover:not(:disabled){transform:translateY(-1px)}
  .da-btn:disabled{opacity:.5;cursor:not-allowed}
  .da-btn-ghost{background:var(--da-gray-100);color:var(--da-gray-700)}
  .da-btn-ghost:hover:not(:disabled){background:var(--da-gray-200)}
  .da-btn-approve{background:linear-gradient(135deg,#15803d,#22c55e);color:white;box-shadow:0 3px 12px rgba(34,197,94,.3)}
  .da-btn-approve:hover:not(:disabled){box-shadow:0 6px 18px rgba(34,197,94,.4)}
  .da-btn-reject{background:linear-gradient(135deg,#be123c,#f43f5e);color:white;box-shadow:0 3px 12px rgba(244,63,94,.28)}
  .da-btn-reject:hover:not(:disabled){box-shadow:0 6px 18px rgba(244,63,94,.38)}
  .da-detail-panel{background:#fff;border-radius:18px;padding:26px;box-shadow:0 2px 16px rgba(15,32,68,.07),0 0 0 1px rgba(15,32,68,.04);position:sticky;top:24px}
  .da-section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--da-blue-600);margin:0 0 12px;display:flex;align-items:center;gap:6px}
  .da-section-label::after{content:'';flex:1;height:1px;background:var(--da-blue-100)}
  .da-detail-row{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--da-gray-100);font-size:13px}
  .da-detail-row:last-child{border-bottom:none}
  .da-detail-key{color:var(--da-gray-400);flex-shrink:0;margin-right:12px}
  .da-detail-val{color:var(--da-gray-900);font-weight:600;text-align:right;word-break:break-word}
  .da-empty{background:#fff;border-radius:20px;padding:64px 32px;text-align:center;box-shadow:0 2px 16px rgba(15,32,68,.06)}
  @keyframes fadeInModal{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
`;

function injectStyles() {
  if (document.getElementById("da-styles")) return;
  const el = document.createElement("style");
  el.id = "da-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}

function ApprovalSkeleton() {
  return (
    <div style={{ maxWidth:1280, margin:"0 auto", padding:"32px 28px" }}>
      <div className="da-skeleton" style={{ height:100, marginBottom:28 }}/>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:24 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[1,2,3].map(i=><div key={i} className="da-skeleton" style={{ height:180 }}/>)}
        </div>
        <div className="da-skeleton" style={{ height:380 }}/>
      </div>
    </div>
  );
}

function DR({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="da-detail-row">
      <span className="da-detail-key">{label}</span>
      <span className="da-detail-val">{value}</span>
    </div>
  );
}

export default function DoctorApproval() {
  const [requests,            setRequests]            = useState([]);
  const [selectedRequest,     setSelectedRequest]     = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [actionLoading,       setActionLoading]       = useState(null);
  const [rejectionReason,     setRejectionReason]     = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [pendingRejectionId,  setPendingRejectionId]  = useState(null);

  const dispatch = useDispatch();

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/doctor-approvals");
      setRequests(res.data || []);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.error || "Failed to load requests", type:"error" }));
    } finally { setLoading(false); }
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await API.get(`/admin/doctor-approvals/${id}`);
      setSelectedRequest(res.data);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.error || "Failed to load details", type:"error" }));
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this doctor registration?")) return;
    try {
      setActionLoading(id);
      await API.post(`/admin/doctor-approvals/${id}/approve`);
      dispatch(showToast({ message:"Doctor approved successfully", type:"success" }));
      fetchRequests();
      if (selectedRequest?._id === id) setSelectedRequest(null);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.error || "Failed to approve", type:"error" }));
    } finally { setActionLoading(null); }
  };

  const handleRejectClick = (id) => {
    setPendingRejectionId(id);
    setRejectionReason("");
    setShowRejectionDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      dispatch(showToast({ message:"Please provide a rejection reason", type:"error" }));
      return;
    }
    try {
      setActionLoading(pendingRejectionId);
      await API.post(`/admin/doctor-approvals/${pendingRejectionId}/reject`, { rejectionReason });
      dispatch(showToast({ message:"Request rejected", type:"success" }));
      setShowRejectionDialog(false);
      setPendingRejectionId(null);
      setRejectionReason("");
      fetchRequests();
      if (selectedRequest?._id === pendingRejectionId) setSelectedRequest(null);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.error || "Failed to reject", type:"error" }));
    } finally { setActionLoading(null); }
  };

  const closeModal = () => {
    setShowRejectionDialog(false);
    setPendingRejectionId(null);
    setRejectionReason("");
  };

  if (loading) return (
    <div className="da-root" style={{ minHeight:"100vh", background:"var(--da-gray-50)" }}>
      <ApprovalSkeleton/>
    </div>
  );

  return (
    <div className="da-root" style={{ minHeight:"100vh", background:"var(--da-gray-50)", padding:"32px 28px" }}>
      <div style={{ maxWidth:1280, margin:"0 auto" }}>

        {/* Header */}
        <div className="da-header-band da-fade da-d1">
          <div style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"rgba(255,255,255,.55)", margin:"0 0 6px" }}>Admin Panel</p>
              <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:800, margin:"0 0 5px", letterSpacing:"-0.4px" }}>Doctor Approval</h1>
              <p style={{ color:"rgba(255,255,255,.6)", margin:0, fontSize:14 }}>Review and approve pending doctor registration requests</p>
            </div>
            <div style={{ background:"rgba(255,255,255,.12)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.2)", borderRadius:50, padding:"10px 20px", display:"flex", alignItems:"center", gap:10, fontSize:14, fontWeight:600, color:"white" }}>
              <Clock size={15}/> {requests.length} Pending
            </div>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="da-empty da-fade da-d2">
            <div style={{ width:80, height:80, background:"var(--da-blue-50)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:36 }}>📋</div>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:22, color:"var(--da-gray-900)", margin:"0 0 8px" }}>No Pending Requests</h2>
            <p style={{ color:"var(--da-gray-500)", margin:0, fontSize:15 }}>All doctor registration requests have been processed.</p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24, alignItems:"start" }}>

            {/* Request list */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {requests.map((req, idx) => (
                <div key={req._id} className="da-request-card da-fade" style={{ animationDelay:`${0.08+idx*0.06}s` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div>
                      <h3 style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:17, color:"var(--da-gray-900)", margin:"0 0 4px" }}>{req.fullName}</h3>
                      <p style={{ fontSize:13, color:"var(--da-gray-500)", margin:"0 0 3px" }}>{req.email}</p>
                      <p style={{ fontSize:11, color:"var(--da-gray-400)", margin:0, display:"flex", alignItems:"center", gap:4 }}>
                        <Clock size={11}/> Submitted {formatDate(req.submittedAt, "N/A")}
                      </p>
                    </div>
                    <span className="da-badge-pending"><Clock size={10}/> Pending</span>
                  </div>
                  <div className="da-meta-grid">
                    {[["Specialization",req.specialization],["Qualification",req.medicalQualification],["Experience",`${req.yearsOfExperience} years`],["Reg. ID",req.medicalRegistrationId]].map(([l,v])=>(
                      <div key={l} className="da-meta-item">
                        <div className="da-meta-label">{l}</div>
                        <div className="da-meta-value">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height:1, background:"var(--da-gray-100)", margin:"14px 0" }}/>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="da-btn da-btn-ghost" style={{ flex:1 }} onClick={()=>handleViewDetails(req._id)}>
                      <Eye size={15}/> View Details
                    </button>
                    <button className="da-btn da-btn-approve" style={{ flex:1 }} onClick={()=>handleApprove(req._id)} disabled={actionLoading===req._id}>
                      <CheckCircle2 size={15}/> {actionLoading===req._id?"Approving…":"Approve"}
                    </button>
                    <button className="da-btn da-btn-reject" style={{ flex:1 }} onClick={()=>handleRejectClick(req._id)} disabled={actionLoading===req._id}>
                      <XCircle size={15}/> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail panel */}
            <div className="da-fade da-d3">
              {selectedRequest ? (
                <div className="da-detail-panel">
                  <div style={{ height:4, background:"linear-gradient(90deg,var(--da-blue-700),var(--da-blue-400))", borderRadius:"4px 4px 0 0", margin:"-26px -26px 22px" }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                    <h2 style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:17, color:"var(--da-gray-900)", margin:0 }}>Request Details</h2>
                    <button onClick={()=>setSelectedRequest(null)} style={{ background:"var(--da-gray-100)", border:"none", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                      <EyeOff size={16}/>
                    </button>
                  </div>
                  <p className="da-section-label"><span>Basic Info</span></p>
                  <DR label="Full Name" value={selectedRequest.fullName}/>
                  <DR label="Age"       value={selectedRequest.age}/>
                  <DR label="Email"     value={selectedRequest.email}/>
                  <DR label="Mobile"    value={selectedRequest.mobileNumber}/>
                  <DR label="Address"   value={selectedRequest.residentialAddress}/>
                  <div style={{ margin:"18px 0 14px" }}>
                    <p className="da-section-label"><Stethoscope size={12}/><span>Professional Info</span></p>
                  </div>
                  <DR label="Qualification"   value={selectedRequest.medicalQualification}/>
                  <DR label="Specialization"  value={selectedRequest.specialization}/>
                  <DR label="Reg. ID"         value={selectedRequest.medicalRegistrationId}/>
                  <DR label="Experience"      value={`${selectedRequest.yearsOfExperience} years`}/>
                  <DR label="Hospital/Clinic" value={selectedRequest.hospitalClinicName}/>
                  <DR label="Clinic Address"  value={selectedRequest.hospitalClinicAddress}/>
                  <DR label="Fees"            value={`₹${Number(selectedRequest.fees || 0)}`}/>
                  <div style={{ display:"flex", gap:10, marginTop:22 }}>
                    <button className="da-btn da-btn-approve" style={{ flex:1 }} onClick={()=>handleApprove(selectedRequest._id)} disabled={actionLoading===selectedRequest._id}>
                      <CheckCircle2 size={14}/> {actionLoading===selectedRequest._id?"…":"Approve"}
                    </button>
                    <button className="da-btn da-btn-reject" style={{ flex:1 }} onClick={()=>handleRejectClick(selectedRequest._id)} disabled={actionLoading===selectedRequest._id}>
                      <XCircle size={14}/> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="da-detail-panel" style={{ textAlign:"center", padding:"48px 24px" }}>
                  <div style={{ width:64, height:64, background:"var(--da-blue-50)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                    <EyeOff size={26} style={{ color:"var(--da-blue-300)" }}/>
                  </div>
                  <p style={{ color:"var(--da-gray-400)", fontSize:14, margin:0 }}>Select a request to view full details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ MODERN REJECTION MODAL ══ */}
      {showRejectionDialog && (
        <div style={{
          position:"fixed", inset:0,
          background:"rgba(15,23,42,.55)",
          backdropFilter:"blur(6px)",
          zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:"16px",
          fontFamily:"'DM Sans','Segoe UI',sans-serif",
        }}>
          <div style={{
            width:"100%", maxWidth:"480px",
            background:"#fff",
            borderRadius:"24px",
            padding:"32px",
            boxShadow:"0 24px 64px rgba(0,0,0,.22)",
            border:"1px solid #dbeafe",
            animation:"fadeInModal .28s ease",
          }}>
            <style>{`@keyframes fadeInModal{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

            {/* Modal header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{
                  width:"48px", height:"48px", borderRadius:"14px",
                  background:"linear-gradient(135deg,#fef2f2,#fee2e2)",
                  border:"1px solid #fecaca",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"0 4px 12px rgba(239,68,68,.15)",
                }}>
                  <AlertTriangle size={22} style={{ color:"#ef4444" }}/>
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:"18px", fontWeight:"800", color:"#1e3a5f", fontFamily:"'Sora',sans-serif" }}>
                    Reject Request
                  </h2>
                  <p style={{ margin:0, fontSize:"12px", color:"#94a3b8" }}>
                    The applicant will be notified by email
                  </p>
                </div>
              </div>
              <button onClick={closeModal} style={{
                width:"32px", height:"32px", borderRadius:"50%",
                border:"1px solid #dbeafe", background:"#f8faff",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", color:"#64748b", flexShrink:0,
              }}
                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                onMouseLeave={e=>e.currentTarget.style.background="#f8faff"}>
                <X size={15}/>
              </button>
            </div>

            {/* Warning note */}
            <div style={{
              background:"linear-gradient(135deg,#fef2f2,#fff5f5)",
              borderRadius:"12px", padding:"12px 16px",
              border:"1px solid #fecaca", marginBottom:"18px",
              display:"flex", alignItems:"flex-start", gap:"10px",
            }}>
              <AlertTriangle size={15} style={{ color:"#ef4444", flexShrink:0, marginTop:"1px" }}/>
              <p style={{ margin:0, fontSize:"13px", color:"#dc2626", lineHeight:1.6 }}>
                This action is permanent. The doctor will receive a rejection email with the reason you provide.
              </p>
            </div>

            {/* Reason textarea */}
            <div style={{ marginBottom:"22px" }}>
              <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#64748b", marginBottom:"7px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={e=>setRejectionReason(e.target.value)}
                placeholder="Describe clearly why this registration is being rejected…"
                rows={4}
                style={{
                  width:"100%", padding:"12px 14px",
                  borderRadius:"12px",
                  border:rejectionReason.trim() ? "1px solid #dbeafe" : "1px solid #fecaca",
                  background:rejectionReason.trim() ? "#f8faff" : "#fff5f5",
                  fontSize:"14px", color:"#1e3a5f",
                  outline:"none", resize:"vertical", lineHeight:"1.6",
                  fontFamily:"inherit", boxSizing:"border-box",
                  transition:"border-color .15s, background .15s",
                }}
                onFocus={e=>{ e.target.style.borderColor="#93c5fd"; e.target.style.background="#fff"; }}
                onBlur={e=>{ e.target.style.borderColor=rejectionReason.trim()?"#dbeafe":"#fecaca"; e.target.style.background=rejectionReason.trim()?"#f8faff":"#fff5f5"; }}
              />
              {!rejectionReason.trim() && (
                <p style={{ margin:"5px 0 0", fontSize:"11px", color:"#ef4444", fontWeight:"500" }}>
                  A reason is required before rejecting
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={closeModal} style={{
                flex:1, padding:"12px", borderRadius:"12px",
                border:"1px solid #dbeafe", background:"#f8faff",
                color:"#64748b", fontWeight:"600", fontSize:"14px",
                cursor:"pointer", fontFamily:"inherit", transition:"all .15s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.color="#2563eb"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="#f8faff"; e.currentTarget.style.color="#64748b"; }}>
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim() || !!actionLoading}
                style={{
                  flex:2, padding:"12px", borderRadius:"12px", border:"none",
                  background:(!rejectionReason.trim()||actionLoading)?"#fca5a5":"linear-gradient(135deg,#dc2626,#f87171)",
                  color:"#fff", fontWeight:"700", fontSize:"14px",
                  cursor:(!rejectionReason.trim()||actionLoading)?"not-allowed":"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                  fontFamily:"inherit",
                  boxShadow:(!rejectionReason.trim()||actionLoading)?"none":"0 4px 14px rgba(220,38,38,.3)",
                  transition:"all .2s",
                }}>
                {actionLoading
                  ? <><Loader2 size={16} style={{ animation:"spin .8s linear infinite" }}/>Rejecting...</>
                  : <><XCircle size={16}/>Confirm Rejection</>}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        </div>
      )}
    </div>
  );
}