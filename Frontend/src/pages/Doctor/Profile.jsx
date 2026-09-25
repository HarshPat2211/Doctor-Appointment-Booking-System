import React, { useEffect, useState, useRef } from "react";
import API from "../util/api";
import { useSelector, useDispatch } from "react-redux";
import { setDoctorProfile } from "../../Redux/doctorSlice";
import { showToast } from "../../Redux/toastSlice";
import { useNavigate } from "react-router-dom";
import { getInitials } from "../../utils/initials";
import {
  User, Mail, Phone, MapPin, Hash, Clock, Building2,
  IndianRupee, GraduationCap, Stethoscope, Camera,
  ChevronDown, Check, Edit3, Save, X, Loader2,
  CheckCircle2, ArrowLeft, AlertCircle,
} from "lucide-react";

/* ─── constants ─── */
const SPECIALIZATIONS = ["Cardiologists","Pediatricians","Neurologists","Dermatologists","Dentists","General Physicians"];
const QUALIFICATIONS  = ["MBBS","BDS","MD","MS","Other"];

/* ─── lazy reveal ─── */
function useLazyReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
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

/* ─── custom dropdown ─── */
function Dropdown({ label, icon, options, value, onChange, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const LS = { display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:"700",color:"#64748b",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.06em" };
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <label style={LS}>{React.cloneElement(icon,{size:11})} {label}{required&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
      <button type="button" onClick={()=>setOpen(!open)} style={{ width:"100%",padding:"11px 14px",borderRadius:"10px",border:open?"1px solid #93c5fd":"1px solid #dbeafe",background:open?"#eff6ff":"#f8faff",fontSize:"14px",color:value?"#1e3a5f":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",fontFamily:"inherit",fontWeight:value?"600":"400",transition:"all .15s",boxSizing:"border-box" }}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>{React.cloneElement(icon,{size:15,style:{color:"#60a5fa",flexShrink:0}})}{value||placeholder}</div>
        <ChevronDown size={15} style={{color:"#94a3b8",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",flexShrink:0}}/>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,width:"100%",background:"#fff",borderRadius:"12px",border:"1px solid #dbeafe",boxShadow:"0 12px 32px rgba(37,99,235,.13)",zIndex:200,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",fontSize:"10px",fontWeight:"700",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid #f1f5f9",background:"#fafcff"}}>{label}</div>
          {options.map(opt=>{
            const sel=value===opt;
            return(
              <button key={opt} type="button" onClick={()=>{onChange(opt);setOpen(false);}} style={{width:"100%",padding:"11px 14px",border:"none",borderBottom:"1px solid #f8faff",background:sel?"#eff6ff":"transparent",color:sel?"#2563eb":"#334155",fontSize:"13px",fontWeight:sel?"700":"400",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"inherit",transition:"background .12s"}}
                onMouseEnter={e=>{if(!sel)e.currentTarget.style.background="#f0f7ff";}}
                onMouseLeave={e=>{if(!sel)e.currentTarget.style.background="transparent";}}>
                {opt}{sel&&<Check size={14} style={{color:"#2563eb",flexShrink:0}}/>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── completion calc ─── */
const calcCompletion = (p) => {
  const fields=[p.fullName,p.email,p.mobileNumber,p.address,(p.medicalQualification==="Other"?p.otherQualification:p.medicalQualification),p.specialization,p.medicalRegistrationId,p.yearsOfExperience,p.hospitalClinicName,p.hospitalClinicAddress,p.fees,p.profileImage];
  return Math.round(fields.filter(f=>f&&f!==""&&f!==0).length/fields.length*100);
};

/* ─── main component ─── */
export default function DoctorProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [editMode,  setEditMode]  = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false); // success popup

  const [profile, setProfile] = useState({
    fullName:"",email:"",age:"",mobileNumber:"",address:"",
    medicalQualification:"MBBS",otherQualification:"",
    specialization:"General Physicians",medicalRegistrationId:"",
    yearsOfExperience:"",hospitalClinicName:"",hospitalClinicAddress:"",
    fees:"",profileImage:"",status:"pending",
  });
  const [previewImage, setPreviewImage] = useState("");
  const [completion,   setCompletion]   = useState(0);

  useEffect(()=>{
    if(!user?._id) return;
    (async()=>{
      try{
        setLoading(true);
        const {data}=await API.get("/doctors/profile");
        const known=QUALIFICATIONS.includes(data.medicalQualification);
        const p={
          fullName:data.fullName||"",email:data.email||"",age:data.age||"",
          mobileNumber:data.mobileNumber||"",address:data.address||"",
          medicalQualification:known?(data.medicalQualification||"MBBS"):"Other",
          otherQualification:known?"":(data.medicalQualification||""),
          specialization:data.specialization||"General Physicians",
          medicalRegistrationId:data.medicalRegistrationId||"",
          yearsOfExperience:data.yearsOfExperience||"",
          hospitalClinicName:data.hospitalClinicName||"",
          hospitalClinicAddress:data.hospitalClinicAddress||"",
          fees:data.fees||data.consultationFeesOnline||data.consultationFeesOffline||"",
          profileImage:data.profileImage||"",status:data.status||"pending",
        };
        setProfile(p); setPreviewImage(data.profileImage||""); setCompletion(calcCompletion(p));
        dispatch(setDoctorProfile(data));
        if(user?.isFirstLogin){ setIsFirstLogin(true); dispatch(showToast({message:"Welcome! Please complete your profile.",type:"info"})); }
      }catch(err){ dispatch(showToast({message:err.response?.data?.message||"Failed to load profile",type:"error"})); }
      finally{ setLoading(false); }
    })();
  },[user,dispatch]);

  const handleChange=(field,val)=>{
    const up={...profile,[field]:val};
    setProfile(up); setCompletion(calcCompletion(up));
  };

  const handleFile=(e)=>{
    const file=e.target.files[0]; if(!file)return;
    if(file.size>5*1024*1024){dispatch(showToast({message:"Image must be under 5MB",type:"error"}));return;}
    if(!file.type.startsWith("image/")){dispatch(showToast({message:"Please upload an image file",type:"error"}));return;}
    setProfile({...profile,profileImage:file}); setPreviewImage(URL.createObjectURL(file));
  };

  const handleSave=async()=>{
    if(Number(profile.age)<20){dispatch(showToast({message:"Age must be at least 20",type:"error"}));return;}
    if(!profile.fullName||!profile.mobileNumber||!profile.address){dispatch(showToast({message:"Fill all required personal fields",type:"error"}));return;}
    if(!profile.medicalQualification||!profile.specialization||!profile.yearsOfExperience||!profile.hospitalClinicName||!profile.hospitalClinicAddress){dispatch(showToast({message:"Fill all required professional fields",type:"error"}));return;}
    if(profile.medicalQualification==="Other"&&!profile.otherQualification.trim()){dispatch(showToast({message:"Please specify your qualification",type:"error"}));return;}
    if(!profile.fees){dispatch(showToast({message:"Enter your consultation fee",type:"error"}));return;}
    setSaving(true);
    try{
      const fd=new FormData();
      ["fullName","mobileNumber","address","age","specialization","yearsOfExperience","hospitalClinicName","hospitalClinicAddress","fees"].forEach(k=>fd.append(k,profile[k]));
      fd.append("medicalQualification",profile.medicalQualification==="Other"?profile.otherQualification:profile.medicalQualification);
      if(profile.profileImage instanceof File) fd.append("profileImage",profile.profileImage);
      const res=await API.post("/doctors/profile",fd,{headers:{"Content-Type":"multipart/form-data"}});
      if(res.data.doctor){
        setProfile({...res.data.doctor}); setPreviewImage(res.data.doctor.profileImage||"");
        setCompletion(calcCompletion(res.data.doctor)); dispatch(setDoctorProfile(res.data.doctor));
      }
      if(isFirstLogin){
        try {
          await API.post("/auth/clear-first-login");
          setIsFirstLogin(false);
        } catch {
          // ignore
        }
      }
      setEditMode(false); setShowSaveModal(true); // show success popup
    }catch(err){ dispatch(showToast({message:err.response?.data?.error||"Error saving profile",type:"error"})); }
    finally{ setSaving(false); }
  };

  /* ── shared input style ── */
  const INP = { width:"100%",padding:"11px 14px 11px 40px",borderRadius:"10px",border:"1px solid #dbeafe",background:"#f8faff",fontSize:"14px",color:"#1e3a5f",outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color .15s" };
  const LBL = { display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:"700",color:"#64748b",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.06em" };

  const FieldIcon=({icon,top=false})=>(
    <span style={{position:"absolute",left:"12px",top:top?"14px":"50%",transform:top?"none":"translateY(-50%)",color:"#60a5fa",pointerEvents:"none"}}>{icon}</span>
  );

  /* ── view value display ── */
  const ViewVal=({val,suffix=""})=>(
    <p style={{margin:0,fontSize:"14px",color:val?"#1e3a5f":"#94a3b8",padding:"11px 0",fontWeight:val?"500":"400"}}>
      {val?`${val}${suffix}`:"Not provided"}
    </p>
  );

  if(loading) return (
    <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"44px",height:"44px",borderRadius:"50%",border:"3px solid #dbeafe",borderTopColor:"#2563eb",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
        <p style={{color:"#2563eb",fontSize:"14px",fontWeight:"500"}}>Loading profile...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </div>
  );

  const hasImg=previewImage&&previewImage!=="";
  const initials=getInitials(profile.fullName)||"D";

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)",padding:"28px",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}} @keyframes fadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

      <div style={{maxWidth:"900px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"22px"}}>

        {/* ── PAGE HEADER ── */}
        <Reveal delay={0}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"16px"}}>
            <div>
              <h1 style={{margin:0,fontSize:"22px",fontWeight:"800",color:"#1e3a5f"}}>Doctor Profile</h1>
              <p style={{margin:"4px 0 0",fontSize:"13px",color:"#64748b"}}>Manage your professional information</p>
            </div>
            <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
              {!editMode?(
                <>
                  <button onClick={()=>setEditMode(true)} style={{padding:"10px 20px",borderRadius:"10px",background:"linear-gradient(135deg,#2563eb,#38bdf8)",color:"#fff",border:"none",fontWeight:"700",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(37,99,235,.28)"}}>
                    <Edit3 size={15}/> Edit Profile
                  </button>
                  <button onClick={()=>navigate("/doctor")} style={{padding:"10px 18px",borderRadius:"10px",border:"1px solid #dbeafe",background:"#f8faff",color:"#64748b",fontWeight:"600",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",fontFamily:"inherit",transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.color="#2563eb";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="#f8faff";e.currentTarget.style.color="#64748b";}}>
                    <ArrowLeft size={15}/> Dashboard
                  </button>
                </>
              ):(
                <>
                  <button onClick={handleSave} disabled={saving} style={{padding:"10px 20px",borderRadius:"10px",background:saving?"#93c5fd":"linear-gradient(135deg,#2563eb,#38bdf8)",color:"#fff",border:"none",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:"6px",fontFamily:"inherit",boxShadow:saving?"none":"0 4px 14px rgba(37,99,235,.28)"}}>
                    {saving?<><Loader2 size={15} style={{animation:"spin .8s linear infinite"}}/>Saving...</>:<><Save size={15}/>Save Changes</>}
                  </button>
                  <button onClick={()=>{setEditMode(false);window.location.reload();}} style={{padding:"10px 18px",borderRadius:"10px",border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",fontWeight:"600",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",fontFamily:"inherit",transition:"all .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"}
                    onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}>
                    <X size={15}/> Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </Reveal>

        {/* ── COMPLETION BAR ── */}
        <Reveal delay={80}>
          <div style={{background:"#fff",borderRadius:"16px",padding:"18px 22px",border:"1px solid #dbeafe",boxShadow:"0 2px 12px rgba(37,99,235,.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <span style={{fontSize:"13px",fontWeight:"600",color:"#1e3a5f"}}>Profile Completion</span>
              <span style={{fontSize:"14px",fontWeight:"800",color:completion===100?"#059669":"#2563eb"}}>{completion}%</span>
            </div>
            <div style={{height:"8px",background:"#f0f7ff",borderRadius:"10px",overflow:"hidden",border:"1px solid #dbeafe"}}>
              <div style={{height:"100%",width:`${completion}%`,background:completion===100?"linear-gradient(90deg,#059669,#34d399)":"linear-gradient(90deg,#2563eb,#38bdf8)",borderRadius:"10px",transition:"width .8s ease"}}/>
            </div>
            {completion<100&&<p style={{margin:"6px 0 0",fontSize:"11px",color:"#94a3b8"}}>Complete your profile to improve visibility and patient trust</p>}
            {completion===100&&<p style={{margin:"6px 0 0",fontSize:"11px",color:"#059669",fontWeight:"600"}}>✓ Profile complete — patients can see your full details</p>}
          </div>
        </Reveal>

        {/* ── FIRST LOGIN BANNER ── */}
        {isFirstLogin&&(
          <Reveal delay={100}>
            <div style={{background:"linear-gradient(135deg,#eff6ff,#dbeafe)",borderRadius:"14px",padding:"16px 20px",border:"1px solid #bfdbfe",display:"flex",alignItems:"flex-start",gap:"12px"}}>
              <AlertCircle size={20} style={{color:"#2563eb",flexShrink:0,marginTop:2}}/>
              <div>
                <p style={{margin:0,fontSize:"14px",fontWeight:"700",color:"#1e3a5f"}}>Welcome! Complete Your Profile</p>
                <p style={{margin:"4px 0 0",fontSize:"13px",color:"#3b5a8a"}}>Your registration data has been pre-filled. Please review and update your information.</p>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── PROFILE HEADER CARD ── */}
        <Reveal delay={120}>
          <div style={{background:"#fff",borderRadius:"18px",padding:"28px",border:"1px solid #dbeafe",boxShadow:"0 2px 16px rgba(37,99,235,.07)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"24px",flexWrap:"wrap"}}>

              {/* Avatar */}
              <div style={{position:"relative",flexShrink:0}}>
                {hasImg?(
                  <div style={{width:"96px",height:"96px",borderRadius:"50%",overflow:"hidden",border:"4px solid #2563eb",boxShadow:"0 6px 20px rgba(37,99,235,.25)"}}>
                    <img src={previewImage} alt="Profile" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>
                ):(
                  <div style={{width:"96px",height:"96px",borderRadius:"50%",background:"linear-gradient(135deg,#2563eb,#38bdf8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"32px",border:"4px solid #fff",boxShadow:"0 6px 20px rgba(37,99,235,.25)"}}>
                    {initials}
                  </div>
                )}
                {editMode&&(
                  <label style={{position:"absolute",bottom:0,right:0,width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#2563eb,#38bdf8)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"2px solid #fff",boxShadow:"0 2px 8px rgba(37,99,235,.3)"}}>
                    <Camera size={14} style={{color:"#fff"}}/>
                    <input type="file" style={{display:"none"}} onChange={handleFile} accept="image/jpeg,image/jpg,image/png"/>
                  </label>
                )}
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <h2 style={{margin:"0 0 4px",fontSize:"20px",fontWeight:"800",color:"#1e3a5f"}}>{profile.fullName||"Doctor Name"}</h2>
                <p style={{margin:"0 0 10px",fontSize:"14px",color:"#2563eb",fontWeight:"600"}}>{profile.specialization||"Specialization"}</p>
                <span style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 12px",borderRadius:"20px",fontSize:"12px",fontWeight:"700",
                  background:profile.status==="approved"?"#ecfdf5":"#fffbeb",
                  color:profile.status==="approved"?"#059669":"#d97706",
                  border:profile.status==="approved"?"1px solid #a7f3d0":"1px solid #fde68a"}}>
                  {profile.status==="approved"?"✓ Active":"⏳ Pending Approval"}
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── PERSONAL INFORMATION ── */}
        <Reveal delay={160}>
          <div style={{background:"#fff",borderRadius:"18px",padding:"26px",border:"1px solid #dbeafe",boxShadow:"0 2px 16px rgba(37,99,235,.07)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"20px"}}>
              <div style={{width:"30px",height:"30px",borderRadius:"8px",background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center",color:"#2563eb"}}><User size={14}/></div>
              <h3 style={{margin:0,fontSize:"15px",fontWeight:"700",color:"#1e3a5f"}}>Personal Information</h3>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px"}}>
              {/* Full Name */}
              <div>
                <label style={LBL}><User size={11}/> Full Name{editMode&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<User size={15}/>}/>
                    <input type="text" value={profile.fullName} onChange={e=>handleChange("fullName",e.target.value)} style={INP} onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="Dr. Full Name"/>
                  </div>
                ):<ViewVal val={profile.fullName}/>}
              </div>

              {/* Email */}
              <div>
                <label style={LBL}><Mail size={11}/> Email Address</label>
                <p style={{margin:0,fontSize:"14px",color:"#64748b",padding:"11px 0"}}>{profile.email||"Not provided"}</p>
                <p style={{margin:0,fontSize:"11px",color:"#94a3b8"}}>Cannot be changed</p>
              </div>

              {/* Mobile */}
              <div>
                <label style={LBL}><Phone size={11}/> Mobile Number{editMode&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<Phone size={15}/>}/>
                    <input type="tel" value={profile.mobileNumber} onChange={e=>handleChange("mobileNumber",e.target.value)} style={INP} onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="+91 98765 43210"/>
                  </div>
                ):<ViewVal val={profile.mobileNumber}/>}
              </div>

              {/* Age */}
              <div>
                <label style={LBL}><Hash size={11}/> Age</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<Hash size={15}/>}/>
                    <input type="number" value={profile.age} onChange={e=>handleChange("age",e.target.value)} style={INP} min="20" onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="30"/>
                  </div>
                ):<ViewVal val={profile.age} suffix=" yrs"/>}
              </div>

              {/* Address */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={LBL}><MapPin size={11}/> Address{editMode&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<MapPin size={15}/>} top/>
                    <textarea value={profile.address} onChange={e=>handleChange("address",e.target.value)} rows={3} style={{...INP,paddingTop:"12px",resize:"none",lineHeight:"1.6"}} onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="Your residential address"/>
                  </div>
                ):<ViewVal val={profile.address}/>}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── PROFESSIONAL INFORMATION ── */}
        <Reveal delay={200}>
          <div style={{background:"#fff",borderRadius:"18px",padding:"26px",border:"1px solid #dbeafe",boxShadow:"0 2px 16px rgba(37,99,235,.07)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"20px"}}>
              <div style={{width:"30px",height:"30px",borderRadius:"8px",background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center",color:"#2563eb"}}><Stethoscope size={14}/></div>
              <h3 style={{margin:0,fontSize:"15px",fontWeight:"700",color:"#1e3a5f"}}>Professional Information</h3>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px"}}>

              {/* Qualification */}
              <div>
                {editMode?(
                  <>
                    <Dropdown label="Medical Qualification" icon={<GraduationCap/>} options={QUALIFICATIONS} value={profile.medicalQualification} onChange={v=>handleChange("medicalQualification",v)} placeholder="Select..." required/>
                    {profile.medicalQualification==="Other"&&(
                      <div style={{marginTop:"12px"}}>
                        <label style={LBL}><GraduationCap size={11}/> Specify Qualification *</label>
                        <div style={{position:"relative"}}>
                          <FieldIcon icon={<GraduationCap size={15}/>}/>
                          <input type="text" value={profile.otherQualification} onChange={e=>handleChange("otherQualification",e.target.value)} style={INP} placeholder="e.g. DM, MCh" onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"}/>
                        </div>
                      </div>
                    )}
                  </>
                ):(
                  <>
                    <label style={LBL}><GraduationCap size={11}/> Medical Qualification</label>
                    <ViewVal val={profile.medicalQualification==="Other"?profile.otherQualification:profile.medicalQualification}/>
                  </>
                )}
              </div>

              {/* Specialization */}
              <div>
                {editMode?(
                  <Dropdown label="Specialization" icon={<Stethoscope/>} options={SPECIALIZATIONS} value={profile.specialization} onChange={v=>handleChange("specialization",v)} placeholder="Select..." required/>
                ):(
                  <>
                    <label style={LBL}><Stethoscope size={11}/> Specialization</label>
                    <ViewVal val={profile.specialization}/>
                  </>
                )}
              </div>

              {/* Registration ID — read only */}
              <div>
                <label style={LBL}><Hash size={11}/> Registration / Doctor ID</label>
                <p style={{margin:0,fontSize:"14px",color:"#64748b",padding:"11px 0"}}>{profile.medicalRegistrationId||"Not provided"}</p>
                <p style={{margin:0,fontSize:"11px",color:"#94a3b8"}}>Cannot be changed</p>
              </div>

              {/* Years of Experience */}
              <div>
                <label style={LBL}><Clock size={11}/> Years of Experience{editMode&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<Clock size={15}/>}/>
                    <input type="number" min="0" value={profile.yearsOfExperience} onChange={e=>handleChange("yearsOfExperience",e.target.value)} style={INP} onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="5"/>
                  </div>
                ):<ViewVal val={profile.yearsOfExperience} suffix=" years"/>}
              </div>

              {/* Hospital Name */}
              <div>
                <label style={LBL}><Building2 size={11}/> Hospital / Clinic Name{editMode&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<Building2 size={15}/>}/>
                    <input type="text" value={profile.hospitalClinicName} onChange={e=>handleChange("hospitalClinicName",e.target.value)} style={INP} onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="City General Hospital"/>
                  </div>
                ):<ViewVal val={profile.hospitalClinicName}/>}
              </div>

              {/* Fees */}
              <div>
                <label style={LBL}><IndianRupee size={11}/> Consultation Fees (₹){editMode&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<IndianRupee size={15}/>}/>
                    <input type="number" min="0" value={profile.fees} onChange={e=>handleChange("fees",e.target.value)} style={INP} onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="500"/>
                  </div>
                ):<ViewVal val={profile.fees?`₹${profile.fees}`:""}/>}
              </div>

              {/* Hospital Address */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={LBL}><MapPin size={11}/> Hospital / Clinic Address{editMode&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>
                {editMode?(
                  <div style={{position:"relative"}}>
                    <FieldIcon icon={<MapPin size={15}/>} top/>
                    <textarea value={profile.hospitalClinicAddress} onChange={e=>handleChange("hospitalClinicAddress",e.target.value)} rows={3} style={{...INP,paddingTop:"12px",resize:"none",lineHeight:"1.6"}} onFocus={e=>e.target.style.borderColor="#93c5fd"} onBlur={e=>e.target.style.borderColor="#dbeafe"} placeholder="Hospital full address"/>
                  </div>
                ):<ViewVal val={profile.hospitalClinicAddress}/>}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── SAVE BOTTOM BAR (edit mode) ── */}
        {editMode&&(
          <Reveal delay={0}>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"12px"}}>
              <button onClick={()=>{setEditMode(false);window.location.reload();}} style={{padding:"13px 24px",borderRadius:"12px",border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",fontSize:"14px",fontWeight:"600",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"}
                onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}>
                <X size={15} style={{marginRight:6,verticalAlign:"middle"}}/> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{padding:"13px 28px",borderRadius:"12px",border:"none",background:saving?"#93c5fd":"linear-gradient(135deg,#2563eb,#38bdf8)",color:"#fff",fontSize:"14px",fontWeight:"700",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:"8px",fontFamily:"inherit",boxShadow:saving?"none":"0 6px 20px rgba(37,99,235,.3)"}}>
                {saving?<><Loader2 size={16} style={{animation:"spin .8s linear infinite"}}/>Saving...</>:<><Save size={16}/>Save Changes</>}
              </button>
            </div>
          </Reveal>
        )}
      </div>

      {/* ══ SUCCESS POPUP MODAL ══ */}
      {showSaveModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",backdropFilter:"blur(6px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
          <div style={{width:"100%",maxWidth:"400px",background:"#fff",borderRadius:"24px",padding:"36px 32px",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,.2)",border:"1px solid #dbeafe",animation:"fadeIn .3s ease"}}>

            {/* Icon */}
            <div style={{width:"68px",height:"68px",borderRadius:"50%",background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",border:"2px solid #a7f3d0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",boxShadow:"0 6px 20px rgba(5,150,105,.15)"}}>
              <CheckCircle2 size={34} style={{color:"#059669"}}/>
            </div>

            <h2 style={{margin:"0 0 8px",fontSize:"20px",fontWeight:"800",color:"#1e3a5f"}}>Profile Saved!</h2>
            <p style={{margin:"0 0 24px",fontSize:"14px",color:"#64748b",lineHeight:1.6}}>
              Your profile has been updated successfully. Patients can now see your latest information.
            </p>

            {/* Completion pill */}
            <div style={{background:"linear-gradient(135deg,#eff6ff,#dbeafe)",borderRadius:"12px",padding:"12px 16px",border:"1px solid #bfdbfe",marginBottom:"24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <span style={{fontSize:"12px",fontWeight:"600",color:"#1e3a5f"}}>Profile Completion</span>
                <span style={{fontSize:"13px",fontWeight:"800",color:completion===100?"#059669":"#2563eb"}}>{completion}%</span>
              </div>
              <div style={{height:"6px",background:"rgba(37,99,235,.1)",borderRadius:"10px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${completion}%`,background:completion===100?"linear-gradient(90deg,#059669,#34d399)":"linear-gradient(90deg,#2563eb,#38bdf8)",borderRadius:"10px"}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={()=>{setShowSaveModal(false);navigate("/doctor");}} style={{flex:1,padding:"12px",borderRadius:"12px",border:"1px solid #dbeafe",background:"#f8faff",color:"#64748b",fontWeight:"600",fontSize:"14px",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.color="#2563eb";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#f8faff";e.currentTarget.style.color="#64748b";}}>
                Dashboard
              </button>
              <button onClick={()=>setShowSaveModal(false)} style={{flex:2,padding:"12px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#2563eb,#38bdf8)",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(37,99,235,.3)"}}>
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}