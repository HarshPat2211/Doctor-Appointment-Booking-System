// src/pages/DoctorServices.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Edit3, Trash2, X, Save, Stethoscope,
  IndianRupee, Clock, Calendar, Star, CheckCircle2,
  PauseCircle, PlayCircle, Loader2,
} from "lucide-react";

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

/* ─── shared input / label style ─── */
const INP = { width:"100%", padding:"11px 14px", borderRadius:"10px", border:"1px solid #dbeafe", background:"#f8faff", fontSize:"14px", color:"#1e3a5f", outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color .15s" };
const LBL = { display:"block", fontSize:"11px", fontWeight:"700", color:"#64748b", marginBottom:"6px", textTransform:"uppercase", letterSpacing:"0.06em" };

/* ─── main ─── */
export default function DoctorServices() {
  const [services, setServices] = useState([
    { id:1, name:"General Consultation", desc:"40-min consultation session for general health checkup and diagnosis.", price:50, duration:40, appointments:45, status:"active", category:"General" },
    { id:2, name:"Pediatric Consultation", desc:"Specialized consultation for children's health and growth checkups.", price:70, duration:40, appointments:20, status:"paused", category:"Pediatrics" },
  ]);

  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null); // id to confirm delete
  const [saving,         setSaving]         = useState(false);
  const [formData, setFormData] = useState({ name:"", desc:"", price:"", duration:"", category:"" });

  const openCreate = () => { setEditingService(null); setFormData({ name:"", desc:"", price:"", duration:"", category:"" }); setIsModalOpen(true); };
  const openEdit   = (s)  => { setEditingService(s);  setFormData(s);  setIsModalOpen(true); };
  const closeModal = ()   => { setIsModalOpen(false); setEditingService(null); };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400)); // simulate save
    if (editingService) {
      setServices(services.map(s => s.id === editingService.id ? { ...s, ...formData, price:Number(formData.price), duration:Number(formData.duration) } : s));
    } else {
      setServices([...services, { id:Date.now(), ...formData, price:Number(formData.price), duration:Number(formData.duration), appointments:0, status:"active" }]);
    }
    setSaving(false);
    closeModal();
  };

  const handleDelete = (id) => { setServices(services.filter(s => s.id !== id)); setDeleteConfirm(null); };
  const toggleStatus = (id) => setServices(services.map(s => s.id === id ? { ...s, status: s.status==="active"?"paused":"active" } : s));

  const stats = [
    { label:"Active Services",    value: services.filter(s=>s.status==="active").length, color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", icon:<Stethoscope size={18}/> },
    { label:"Total Appointments", value: services.reduce((a,s)=>a+s.appointments,0),     color:"#0891b2", bg:"#ecfeff", border:"#a5f3fc", icon:<Calendar size={18}/> },
    { label:"Avg Fee",            value: `₹${Math.round(services.reduce((a,s)=>a+s.price,0)/Math.max(services.length,1))}`, color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", icon:<IndianRupee size={18}/> },
    { label:"Avg Rating",         value: "4.9 ⭐", color:"#d97706", bg:"#fffbeb", border:"#fde68a", icon:<Star size={18}/> },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)", padding:"28px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"24px" }}>

        {/* ── HEADER ── */}
        <Reveal delay={0}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"14px" }}>
            <div>
              <h1 style={{ margin:0, fontSize:"22px", fontWeight:"800", color:"#1e3a5f" }}>My Services</h1>
              <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#64748b" }}>Manage your medical services and consultation offerings</p>
            </div>
            <button onClick={openCreate} style={{ padding:"11px 22px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#2563eb,#38bdf8)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", gap:"7px", fontFamily:"inherit", boxShadow:"0 6px 20px rgba(37,99,235,.28)", transition:"all .2s" }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 26px rgba(37,99,235,.4)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 6px 20px rgba(37,99,235,.28)"}>
              <Plus size={16}/> Add New Service
            </button>
          </div>
        </Reveal>

        {/* ── STATS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"16px" }}>
          {stats.map((s,i) => (
            <Reveal key={i} delay={i*70}>
              <div style={{ background:"#fff", borderRadius:"14px", padding:"18px 20px", border:`1px solid ${s.border}`, boxShadow:"0 2px 12px rgba(37,99,235,.06)", display:"flex", alignItems:"center", gap:"14px" }}>
                <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:s.bg, border:`1px solid ${s.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:s.color, flexShrink:0 }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ margin:0, fontSize:"11px", color:"#94a3b8", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</p>
                  <p style={{ margin:"3px 0 0", fontSize:"22px", fontWeight:"800", color:"#1e3a5f" }}>{s.value}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── SERVICE CARDS ── */}
        {services.length === 0 ? (
          <Reveal delay={0}>
            <div style={{ background:"#fff", borderRadius:"18px", padding:"56px 24px", textAlign:"center", border:"1px solid #dbeafe" }}>
              <Stethoscope size={36} style={{ color:"#bfdbfe", margin:"0 auto 12px" }}/>
              <p style={{ color:"#94a3b8", fontSize:"14px", margin:0 }}>No services yet — add your first service</p>
            </div>
          </Reveal>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"20px" }}>
            {services.map((service, i) => (
              <Reveal key={service.id} delay={i*80}>
                <div style={{ background:"#fff", borderRadius:"18px", padding:"22px", border:"1px solid #dbeafe", boxShadow:"0 2px 14px rgba(37,99,235,.07)", display:"flex", flexDirection:"column", gap:"0", transition:"box-shadow .2s,transform .2s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 8px 32px rgba(37,99,235,.13)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 2px 14px rgba(37,99,235,.07)"; e.currentTarget.style.transform="none"; }}>

                  {/* Card header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <h2 style={{ margin:"0 0 6px", fontSize:"16px", fontWeight:"700", color:"#1e3a5f" }}>{service.name}</h2>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"700",
                        color:service.status==="active"?"#059669":"#64748b",
                        background:service.status==="active"?"#ecfdf5":"#f1f5f9",
                        border:service.status==="active"?"1px solid #a7f3d0":"1px solid #e2e8f0" }}>
                        <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:service.status==="active"?"#22c55e":"#94a3b8" }}/>
                        {service.status==="active"?"Active":"Paused"}
                      </span>
                    </div>
                    <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                      <button onClick={()=>openEdit(service)} title="Edit" style={{ width:"32px", height:"32px", borderRadius:"8px", border:"1px solid #dbeafe", background:"#f8faff", color:"#2563eb", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                        onMouseEnter={e=>{ e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.borderColor="#93c5fd"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="#f8faff"; e.currentTarget.style.borderColor="#dbeafe"; }}>
                        <Edit3 size={14}/>
                      </button>
                      <button onClick={()=>setDeleteConfirm(service.id)} title="Delete" style={{ width:"32px", height:"32px", borderRadius:"8px", border:"1px solid #fecaca", background:"#fef2f2", color:"#ef4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                        onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"}
                        onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ margin:"0 0 16px", fontSize:"13px", color:"#64748b", lineHeight:1.65 }}>{service.desc}</p>

                  {/* Stats */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0", borderRadius:"10px", border:"1px solid #dbeafe", overflow:"hidden", marginBottom:"16px" }}>
                    {[
                      { icon:<IndianRupee size={13}/>, label:"Price", value:`₹${service.price}`, color:"#2563eb" },
                      { icon:<Clock size={13}/>, label:"Duration", value:`${service.duration}m`, color:"#0891b2" },
                      { icon:<Calendar size={13}/>, label:"Booked", value:service.appointments, color:"#059669" },
                    ].map((stat,j) => (
                      <div key={j} style={{ padding:"10px 8px", textAlign:"center", background:"#fafcff", borderRight:j<2?"1px solid #dbeafe":"none" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"3px", color:stat.color, marginBottom:"2px" }}>{stat.icon}</div>
                        <p style={{ margin:0, fontSize:"13px", fontWeight:"800", color:"#1e3a5f" }}>{stat.value}</p>
                        <p style={{ margin:0, fontSize:"10px", color:"#94a3b8" }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Toggle button */}
                  <button onClick={()=>toggleStatus(service.id)} style={{
                    width:"100%", padding:"10px", borderRadius:"10px",
                    border:service.status==="active"?"1px solid #fde68a":"1px solid #a7f3d0",
                    background:service.status==="active"?"#fffbeb":"#ecfdf5",
                    color:service.status==="active"?"#d97706":"#059669",
                    fontWeight:"600", fontSize:"13px", cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                    fontFamily:"inherit", transition:"all .15s",
                  }}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    {service.status==="active"
                      ? <><PauseCircle size={15}/> Pause Service</>
                      : <><PlayCircle size={15}/> Activate Service</>}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* ══ ADD / EDIT MODAL ══ */}
      {isModalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ width:"100%", maxWidth:"500px", background:"#fff", borderRadius:"24px", padding:"32px", boxShadow:"0 24px 64px rgba(0,0,0,.2)", border:"1px solid #dbeafe", animation:"fadeIn .28s ease", maxHeight:"90vh", overflowY:"auto" }}>

            {/* Modal header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
                  {editingService ? <Edit3 size={16}/> : <Plus size={16}/>}
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:"17px", fontWeight:"800", color:"#1e3a5f" }}>{editingService?"Edit Service":"New Service"}</h2>
                  <p style={{ margin:0, fontSize:"11px", color:"#94a3b8" }}>{editingService?"Update your service details":"Add a new consultation service"}</p>
                </div>
              </div>
              <button onClick={closeModal} style={{ width:"32px", height:"32px", borderRadius:"50%", border:"1px solid #dbeafe", background:"#f8faff", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                onMouseLeave={e=>e.currentTarget.style.background="#f8faff"}>
                <X size={15}/>
              </button>
            </div>

            {/* Form */}
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

              <div>
                <label style={LBL}>Service Title *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., General Consultation" style={INP}
                  onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
              </div>

              <div>
                <label style={LBL}>Description *</label>
                <textarea name="desc" value={formData.desc} onChange={handleChange} placeholder="Describe this service..." rows={3}
                  style={{ ...INP, resize:"none", lineHeight:1.6 }}
                  onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                <div>
                  <label style={LBL}><span style={{ display:"flex", alignItems:"center", gap:"4px" }}><IndianRupee size={10}/> Price (₹) *</span></label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="500" style={INP}
                    onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                </div>
                <div>
                  <label style={LBL}><span style={{ display:"flex", alignItems:"center", gap:"4px" }}><Clock size={10}/> Duration (min) *</span></label>
                  <input type="number" name="duration" value={formData.duration} onChange={handleChange} placeholder="40" style={INP}
                    onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                </div>
              </div>

              <div>
                <label style={LBL}>Category</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="e.g., Pediatrics, Cardiology" style={INP}
                  onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display:"flex", gap:"10px", marginTop:"24px", paddingTop:"20px", borderTop:"1px solid #f1f5f9" }}>
              <button onClick={closeModal} style={{ flex:1, padding:"12px", borderRadius:"12px", border:"1px solid #dbeafe", background:"#f8faff", color:"#64748b", fontWeight:"600", fontSize:"14px", cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.color="#2563eb"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="#f8faff"; e.currentTarget.style.color="#64748b"; }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving||!formData.name||!formData.price} style={{ flex:2, padding:"12px", borderRadius:"12px", border:"none", background:(saving||!formData.name||!formData.price)?"#93c5fd":"linear-gradient(135deg,#2563eb,#38bdf8)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:(saving||!formData.name||!formData.price)?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontFamily:"inherit", boxShadow:(saving||!formData.name||!formData.price)?"none":"0 4px 14px rgba(37,99,235,.28)" }}>
                {saving
                  ? <><Loader2 size={16} style={{animation:"spin .8s linear infinite"}}/>Saving...</>
                  : <><Save size={16}/>{editingService?"Save Changes":"Create Service"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ width:"100%", maxWidth:"380px", background:"#fff", borderRadius:"24px", padding:"32px", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,.2)", border:"1px solid #dbeafe", animation:"fadeIn .28s ease" }}>
            <div style={{ width:"60px", height:"60px", borderRadius:"50%", background:"#fef2f2", border:"2px solid #fecaca", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Trash2 size={26} style={{ color:"#ef4444" }}/>
            </div>
            <h2 style={{ margin:"0 0 8px", fontSize:"18px", fontWeight:"800", color:"#1e3a5f" }}>Delete Service?</h2>
            <p style={{ margin:"0 0 24px", fontSize:"13px", color:"#64748b", lineHeight:1.65 }}>
              This will permanently remove the service. This action cannot be undone.
            </p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"12px", borderRadius:"12px", border:"1px solid #dbeafe", background:"#f8faff", color:"#64748b", fontWeight:"600", fontSize:"14px", cursor:"pointer", fontFamily:"inherit" }}
                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                onMouseLeave={e=>e.currentTarget.style.background="#f8faff"}>
                Cancel
              </button>
              <button onClick={()=>handleDelete(deleteConfirm)} style={{ flex:1, padding:"12px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#ef4444,#f87171)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(239,68,68,.28)" }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}