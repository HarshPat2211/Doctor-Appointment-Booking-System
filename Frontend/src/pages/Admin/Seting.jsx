import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Save, Settings2, Globe, Bell, Mail,
  MessageSquare, Loader2, ChevronDown, Check,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { showToast } from "../../Redux/toastSlice";
import { getSiteName, setSiteName, getSiteEmail, setSiteEmail } from "../../utils/siteName";
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

/* ─────────────────────────────────────
   TIMEZONE DROPDOWN — portal-based
   Renders on document.body so it is
   NEVER clipped by any parent container
───────────────────────────────────── */
const TIMEZONES = [
  { value:"Asia/Kolkata",     label:"Asia/Kolkata (IST)"      },
  { value:"UTC",              label:"UTC"                      },
  { value:"America/New_York", label:"America/New_York (EST)"  },
  { value:"Europe/London",    label:"Europe/London (GMT)"      },
  { value:"Asia/Dubai",       label:"Asia/Dubai (GST)"         },
  { value:"Asia/Singapore",   label:"Asia/Singapore (SGT)"     },
  { value:"America/Chicago",  label:"America/Chicago (CST)"    },
  { value:"America/Los_Angeles", label:"America/Los_Angeles (PST)" },
];

function TZDropdown({ value, onChange }) {
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top:0, left:0, width:0 });

  const openDrop = () => {
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top:   rect.bottom + window.scrollY + 6,
      left:  rect.left   + window.scrollX,
      width: rect.width,
    });
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current   && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX, width: rect.width });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open]);

  const selected = TIMEZONES.find(t => t.value === value);

  const panel = open && ReactDOM.createPortal(
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top:   pos.top,
        left:  pos.left,
        width: pos.width,
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #dbeafe",
        boxShadow: "0 16px 48px rgba(37,99,235,.16)",
        zIndex: 99999,
        overflow: "hidden",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ padding:"8px 14px", fontSize:"10px", fontWeight:"700", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid #f1f5f9", background:"#fafcff" }}>
        Select Timezone
      </div>

      {/* Options */}
      <div style={{ maxHeight:"220px", overflowY:"auto", scrollbarWidth:"thin" }}>
        {TIMEZONES.map(tz => {
          const sel = value === tz.value;
          return (
            <button
              key={tz.value}
              type="button"
              onClick={() => { onChange(tz.value); setOpen(false); }}
              style={{
                width:"100%", padding:"11px 14px",
                border:"none", borderBottom:"1px solid #f8faff",
                background: sel ? "#eff6ff" : "transparent",
                color: sel ? "#2563eb" : "#334155",
                fontSize:"13px", fontWeight: sel ? "700" : "400",
                cursor:"pointer", textAlign:"left",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                fontFamily:"inherit", transition:"background .1s",
              }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#f0f7ff"; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <Globe size={14} style={{ color: sel ? "#2563eb" : "#94a3b8", flexShrink:0 }}/>
                {tz.label}
              </div>
              {sel && <Check size={14} style={{ color:"#2563eb", flexShrink:0 }}/>}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <div ref={triggerRef} style={{ position:"relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : openDrop}
        style={{
          width:"100%", padding:"11px 14px",
          borderRadius:"10px",
          border: open ? "1px solid #93c5fd" : "1px solid #dbeafe",
          background: open ? "#eff6ff" : "#f8faff",
          fontSize:"14px", color:"#1e3a5f",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          cursor:"pointer", fontFamily:"inherit",
          fontWeight:"500", transition:"all .15s", boxSizing:"border-box",
        }}
      >
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <Globe size={15} style={{ color:"#60a5fa", flexShrink:0 }}/>
          <span>{selected?.label || "Select timezone..."}</span>
        </div>
        <ChevronDown
          size={15}
          style={{ color:"#94a3b8", transform: open ? "rotate(180deg)" : "rotate(0)", transition:"transform .2s", flexShrink:0 }}
        />
      </button>
      {panel}
    </div>
  );
}

/* ─── toggle switch ─── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{ width:"44px", height:"24px", borderRadius:"12px", background: checked ? "linear-gradient(135deg,#2563eb,#38bdf8)" : "#e2e8f0", border:"none", cursor:"pointer", position:"relative", padding:0, transition:"background .2s", flexShrink:0 }}
    >
      <span style={{ position:"absolute", top:"3px", left: checked ? "22px" : "3px", width:"18px", height:"18px", borderRadius:"50%", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,.15)", transition:"left .2s" }}/>
    </button>
  );
}

const INP = { width:"100%", padding:"11px 14px", borderRadius:"10px", border:"1px solid #dbeafe", background:"#f8faff", fontSize:"14px", color:"#1e3a5f", outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color .15s" };
const LBL = { display:"block", fontSize:"11px", fontWeight:"700", color:"#64748b", marginBottom:"6px", textTransform:"uppercase", letterSpacing:"0.06em" };

/* ─── main ─── */
export default function Settings() {
  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: getSiteName(),
    siteEmail: getSiteEmail(),
    emailNotifications: true,
    smsNotifications: false,
    timezone: "Asia/Kolkata",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    if (!settings.siteEmail.trim()) {
      dispatch(showToast({ message: "Support email is required", type: "warning" }));
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.siteEmail.trim());
    if (!emailOk) {
      dispatch(showToast({ message: "Please enter a valid support email", type: "warning" }));
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSiteName(settings.siteName);
    setSiteEmail(settings.siteEmail);
    try {
      await API.post("/admin/settings/test-email", {
        email: settings.siteEmail.trim(),
        siteName: settings.siteName.trim(),
      });
      dispatch(showToast({ message:"Settings saved. Email sent.", type:"success" }));
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || "Settings saved, but email failed", type: "warning" }));
    }
    setSaving(false);
  };

  const notifItems = [
    { key:"emailNotifications", icon:<Mail size={15}/>,        label:"Email Notifications", desc:"Send appointment reminders via email" },
   
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f7ff 0%,#ffffff 55%,#e8f4ff 100%)", padding:"28px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>

      <div style={{ maxWidth:"620px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"22px" }}>

        {/* ── HEADER ── */}
        <Reveal delay={0}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"38px", height:"38px", borderRadius:"10px", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", boxShadow:"0 4px 12px rgba(37,99,235,.25)" }}>
              <Settings2 size={18}/>
            </div>
            <div>
              <h1 style={{ margin:0, fontSize:"22px", fontWeight:"800", color:"#1e3a5f" }}>Settings</h1>
              <p style={{ margin:0, fontSize:"12px", color:"#64748b" }}>Manage system configuration and preferences</p>
            </div>
          </div>
        </Reveal>

        {/* ── GENERAL ── */}
        <Reveal delay={80}>
          <div style={{ background:"#fff", borderRadius:"18px", padding:"26px", border:"1px solid #dbeafe", boxShadow:"0 2px 16px rgba(37,99,235,.07)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"20px" }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#eff6ff", border:"1px solid #bfdbfe", display:"flex", alignItems:"center", justifyContent:"center", color:"#2563eb" }}>
                <Settings2 size={14}/>
              </div>
              <h3 style={{ margin:0, fontSize:"14px", fontWeight:"700", color:"#1e3a5f" }}>General</h3>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              <div>
                <label style={LBL}>Site Name</label>
                <input
                  type="text" name="siteName" value={settings.siteName} onChange={handleChange}
                  style={INP}
                  onFocus={e=>e.target.style.borderColor="#93c5fd"}
                  onBlur={e=>e.target.style.borderColor="#dbeafe"}
                />
              </div>

              <div>
                <label style={LBL}>Support Email</label>
                <input
                  type="email" name="siteEmail" value={settings.siteEmail} onChange={handleChange}
                  style={INP}
                  placeholder="support@example.com"
                  required
                  onFocus={e=>e.target.style.borderColor="#93c5fd"}
                  onBlur={e=>e.target.style.borderColor="#dbeafe"}
                />
              </div>

              <div>
                <label style={LBL}>Default Timezone</label>
                {/* Portal-based dropdown — never clipped */}
                <TZDropdown value={settings.timezone} onChange={v=>setSettings(p=>({ ...p, timezone:v }))}/>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── NOTIFICATIONS ── */}
        <Reveal delay={140}>
          <div style={{ background:"#fff", borderRadius:"18px", padding:"26px", border:"1px solid #dbeafe", boxShadow:"0 2px 16px rgba(37,99,235,.07)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"20px" }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#eff6ff", border:"1px solid #bfdbfe", display:"flex", alignItems:"center", justifyContent:"center", color:"#2563eb" }}>
                <Bell size={14}/>
              </div>
              <h3 style={{ margin:0, fontSize:"14px", fontWeight:"700", color:"#1e3a5f" }}>Notifications</h3>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              {notifItems.map(n => (
                <div key={n.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderRadius:"12px", border:"1px solid #dbeafe", background: settings[n.key] ? "#fafcff" : "#f8faff", transition:"all .15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"8px", background: settings[n.key] ? "#eff6ff" : "#f1f5f9", border:`1px solid ${settings[n.key]?"#bfdbfe":"#e2e8f0"}`, display:"flex", alignItems:"center", justifyContent:"center", color: settings[n.key] ? "#2563eb" : "#94a3b8", transition:"all .15s" }}>
                      {n.icon}
                    </div>
                    <div>
                      <p style={{ margin:0, fontSize:"13px", fontWeight:"600", color:"#1e3a5f" }}>{n.label}</p>
                      <p style={{ margin:0, fontSize:"11px", color:"#94a3b8" }}>{n.desc}</p>
                    </div>
                  </div>
                  <Toggle checked={settings[n.key]} onChange={v=>setSettings(p=>({ ...p, [n.key]:v }))}/>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── SAVE ── */}
        <Reveal delay={180}>
          <button
            onClick={handleSave} disabled={saving}
            style={{ width:"100%", padding:"14px", borderRadius:"12px", border:"none", background: saving ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#38bdf8)", color:"#fff", fontSize:"15px", fontWeight:"700", cursor: saving ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontFamily:"inherit", boxShadow: saving ? "none" : "0 6px 20px rgba(37,99,235,.3)", transition:"all .2s" }}
            onMouseEnter={e=>{ if(!saving) e.currentTarget.style.boxShadow="0 8px 26px rgba(37,99,235,.4)"; }}
            onMouseLeave={e=>{ if(!saving) e.currentTarget.style.boxShadow="0 6px 20px rgba(37,99,235,.3)"; }}
          >
            {saving
              ? <><Loader2 size={18} style={{ animation:"spin .8s linear infinite" }}/>Saving...</>
              : <><Save size={18}/>Save Settings</>
            }
          </button>
        </Reveal>

      </div>
    </div>
  );
}