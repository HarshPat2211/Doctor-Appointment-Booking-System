import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Trash2, Loader2, Users, Mail, Phone, X } from "lucide-react";
import API from "../util/api";
import { showToast } from "../../Redux/toastSlice";

function useLazyReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { threshold });
    io.observe(el); return () => io.disconnect();
  }, [threshold]);
  return [ref, visible];
}
function Reveal({ children, delay = 0, style = {} }) {
  const [ref, v] = useLazyReveal();
  return <div ref={ref} style={{ ...style, opacity:v?1:0, transform:v?"translateY(0)":"translateY(22px)", transition:`opacity .55s ${delay}ms ease,transform .55s ${delay}ms ease` }}>{children}</div>;
}

export default function ManagePatients() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search,        setSearch]        = useState("");
  const [patients,      setPatients]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState({ id:null, type:null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/patients");
      const list = Array.isArray(res.data) ? res.data : [];
      setPatients(
        list.map((p) => ({
          id: p._id,
          name: p.name || "N/A",
          email: p.email || "N/A",
          phone: p.phone || p.mobileNumber || "N/A",
          gender: p.gender || "N/A",
          status: "Active",
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    try {
      setActionLoading({ id, type:"delete" });
      await API.delete(`/admin/patients/${id}`);
      setPatients(prev => prev.filter(p => p.id !== id));
      dispatch(showToast({ message:"Patient deleted successfully", type:"success" }));
    } catch { dispatch(showToast({ message:"Failed to delete patient", type:"error" })); }
    finally { setActionLoading({ id:null, type:null }); setDeleteConfirm(null); }
  };

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.gender.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:"44px", height:"44px", borderRadius:"50%", border:"3px solid #dbeafe", borderTopColor:"#2563eb", animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
        <p style={{ color:"#2563eb", fontSize:"14px", fontWeight:"500" }}>Loading patients...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)", padding:"28px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}} @keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"22px" }}>

        <Reveal delay={0}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"14px" }}>
            <div>
              <h1 style={{ margin:0, fontSize:"22px", fontWeight:"800", color:"#1e3a5f" }}>Manage Patients</h1>
              <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#64748b" }}>View and manage all registered patients</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 16px", borderRadius:"12px", background:"#eff6ff", border:"1px solid #bfdbfe" }}>
              <Users size={15} style={{ color:"#2563eb" }}/>
              <span style={{ fontSize:"13px", fontWeight:"700", color:"#2563eb" }}>{patients.length} Total Patients</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div style={{ background:"#fff", borderRadius:"14px", padding:"16px 18px", border:"1px solid #dbeafe", boxShadow:"0 2px 10px rgba(37,99,235,.06)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 14px", borderRadius:"10px", border:"1px solid #dbeafe", background:"#f8faff" }}>
              <Search size={16} style={{ color:"#60a5fa", flexShrink:0 }}/>
              <input type="text" placeholder="Search by name, email, phone, or gender..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ border:"none", outline:"none", background:"transparent", width:"100%", fontSize:"14px", color:"#1e3a5f", fontFamily:"inherit" }}/>
              {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:0, display:"flex" }}><X size={15}/></button>}
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div style={{ background:"#fff", borderRadius:"18px", border:"1px solid #dbeafe", boxShadow:"0 2px 16px rgba(37,99,235,.07)", overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1.8fr 2.2fr 1.3fr 1fr 1fr 120px", background:"linear-gradient(135deg,#eff6ff,#f8faff)", borderBottom:"1px solid #dbeafe", padding:"12px 20px" }}>
              {["Patient Name","Email","Phone","Gender","Status","Actions"].map((h,i) => (
                <div key={i} style={{ fontSize:"11px", fontWeight:"700", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", textAlign:i===5?"center":"left" }}>{h}</div>
              ))}
            </div>

            {filtered.length > 0 ? (
              <div>
                {filtered.map((p, i) => {
                  const isDeleting = actionLoading.id===p.id && actionLoading.type==="delete";
                  return (
                    <Reveal key={p.id} delay={i*40}>
                      <div style={{ display:"grid", gridTemplateColumns:"1.8fr 2.2fr 1.3fr 1fr 1fr 120px", padding:"13px 20px", borderBottom:i<filtered.length-1?"1px solid #f1f5f9":"none", alignItems:"center", transition:"background .15s" }}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8faff"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"700", fontSize:"13px", flexShrink:0 }}>{p.name.charAt(0).toUpperCase()}</div>
                          <span style={{ fontSize:"13px", fontWeight:"600", color:"#1e3a5f", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px", minWidth:0 }}>
                          <Mail size={13} style={{ color:"#60a5fa", flexShrink:0 }}/>
                          <span style={{ fontSize:"13px", color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.email}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <Phone size={13} style={{ color:"#60a5fa", flexShrink:0 }}/>
                          <span style={{ fontSize:"13px", color:"#475569" }}>{p.phone}</span>
                        </div>
                        <div>
                          <span style={{ fontSize:"13px", color:"#475569", textTransform:"capitalize" }}>{p.gender || "N/A"}</span>
                        </div>
                        <div>
                          <span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"700", color:"#059669", background:"#ecfdf5", border:"1px solid #a7f3d0" }}>{p.status}</span>
                        </div>
                        <div style={{ display:"flex", gap:"8px", justifyContent:"center" }}>
                          <button title="View" style={{ width:"32px", height:"32px", borderRadius:"8px", border:"1px solid #dbeafe", background:"#f8faff", color:"#2563eb", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                            onClick={() => navigate(`/admin/patients/${p.id}`)}
                            onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#93c5fd";}}
                            onMouseLeave={e=>{e.currentTarget.style.background="#f8faff";e.currentTarget.style.borderColor="#dbeafe";}}>
                            <Eye size={14}/>
                          </button>
                          <button onClick={()=>setDeleteConfirm({ id:p.id, name:p.name })} disabled={isDeleting} title="Delete"
                            style={{ width:"32px", height:"32px", borderRadius:"8px", border:"1px solid #fecaca", background:"#fef2f2", color:"#ef4444", cursor:isDeleting?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", opacity:isDeleting?.6:1 }}
                            onMouseEnter={e=>{if(!isDeleting)e.currentTarget.style.background="#fee2e2";}}
                            onMouseLeave={e=>{if(!isDeleting)e.currentTarget.style.background="#fef2f2";}}>
                            {isDeleting ? <Loader2 size={13} style={{animation:"spin .8s linear infinite"}}/> : <Trash2 size={14}/>}
                          </button>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding:"56px 24px", textAlign:"center" }}>
                <Users size={32} style={{ color:"#bfdbfe", margin:"0 auto 10px" }}/>
                <p style={{ color:"#94a3b8", fontSize:"14px", margin:0 }}>No patients found</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div style={{ padding:"12px 20px", borderTop:"1px solid #f1f5f9", background:"#fafcff" }}>
                <p style={{ margin:0, fontSize:"12px", color:"#94a3b8" }}>
                  Showing <strong style={{ color:"#2563eb" }}>{filtered.length}</strong> of <strong style={{ color:"#2563eb" }}>{patients.length}</strong> patients
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
            <h2 style={{ margin:"0 0 8px", fontSize:"18px", fontWeight:"800", color:"#1e3a5f" }}>Delete Patient?</h2>
            <p style={{ margin:"0 0 6px", fontSize:"14px", color:"#1e3a5f", fontWeight:"600" }}>{deleteConfirm.name}</p>
            <p style={{ margin:"0 0 24px", fontSize:"13px", color:"#64748b", lineHeight:1.65 }}>This will permanently remove the patient and all their data.</p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"12px", borderRadius:"12px", border:"1px solid #dbeafe", background:"#f8faff", color:"#64748b", fontWeight:"600", fontSize:"14px", cursor:"pointer", fontFamily:"inherit" }}
                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8faff"}>Cancel</button>
              <button onClick={()=>handleDelete(deleteConfirm.id)} style={{ flex:1, padding:"12px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#ef4444,#f87171)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(239,68,68,.28)" }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}