import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import API from "../util/api";
import { logout } from "../../Redux/authSlice";
import {
  LayoutDashboard, Stethoscope, Users, CalendarDays,
  FileText, Settings, UserCheck, LogOut,
  ChevronLeft, ChevronRight, User,
} from "lucide-react";
import { useSiteName } from "../../utils/siteName";

export default function AdminSidebar() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector((state) => state.auth);
  const siteName  = useSiteName();
  const siteInitial = siteName.trim().charAt(0).toUpperCase() || "H";

  const [collapsed,  setCollapsed]  = useState(false);
  const [open,       setOpen]       = useState(false);
  const dropdownRef = useRef(null);

  const navItems = [
    { path: "/admin",                label: "Dashboard",       icon: <LayoutDashboard size={22} />, exact: true },
    { path: "/admin/doctor-approval",label: "Doctor Approval", icon: <UserCheck size={22} /> },
    { path: "/admin/doctors",        label: "Doctors",         icon: <Stethoscope size={22} /> },
    { path: "/admin/patients",       label: "Patients",        icon: <Users size={22} /> },
    { path: "/admin/appointments",   label: "Appointments",    icon: <CalendarDays size={22} /> },
    { path: "/admin/report",         label: "Report",            icon: <FileText size={22} /> },
  
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch (e) { console.error("Logout failed:", e); }
    dispatch(logout());
    navigate("/login");
    setOpen(false);
  };

  const ICON_SIZE = 36;

  return (
    <aside style={{
      width: collapsed ? "112px" : "240px",
      transition: "width 0.25s ease",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)",
      borderRight: "1px solid #dbeafe",
      boxShadow: "2px 0 12px rgba(59,130,246,0.07)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "20px 14px",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      boxSizing: "border-box",
    }}>

      <div>
        {/* ── TOP ROW: Logo + Collapse ── */}
        <div style={{ display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:"28px", gap:"8px" }}>
          {collapsed ? (
            <>
              <div style={{ width:`${ICON_SIZE}px`, height:`${ICON_SIZE}px`, borderRadius:"10px", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"800", fontSize:"17px", flexShrink:0 }}>
                {siteInitial}
              </div>
              <button onClick={()=>setCollapsed(false)} title="Expand" style={{ width:"26px", height:"26px", borderRadius:"50%", background:"#2563eb", border:"2px solid #fff", boxShadow:"0 2px 8px rgba(37,99,235,.3)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", flexShrink:0, padding:0 }}>
                <ChevronRight size={13}/>
              </button>
            </>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", minWidth:0 }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"800", fontSize:"16px", flexShrink:0 }}>
                  {siteInitial}
                </div>
                <div style={{ minWidth:0 }}>
                  <h1 style={{ fontSize:"15px", fontWeight:"700", color:"#1e3a5f", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{siteName}</h1>
                  <p style={{ fontSize:"10px", color:"#64748b", margin:0 }}>Admin Panel</p>
                </div>
              </div>
              <button onClick={()=>setCollapsed(true)} title="Collapse" style={{ width:"26px", height:"26px", borderRadius:"50%", background:"#2563eb", border:"2px solid #fff", boxShadow:"0 2px 8px rgba(37,99,235,.3)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", flexShrink:0, padding:0 }}>
                <ChevronLeft size={13}/>
              </button>
            </>
          )}
        </div>

        {/* Nav label */}
        {!collapsed && (
          <p style={{ fontSize:"10px", fontWeight:"600", color:"#94a3b8", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", paddingLeft:"10px" }}>
            Main Menu
          </p>
        )}

        {/* Nav links */}
        <nav style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
          {navItems.map((item, i) => (
            <NavLink
              key={i}
              to={item.path}
              end={item.exact}
              title={collapsed ? item.label : ""}
              style={({ isActive }) => ({
                display:"flex", alignItems:"center", gap:"10px",
                padding: collapsed ? "9px 7px" : "12px 12px",
                borderRadius:"10px", textDecoration:"none",
                justifyContent:"flex-start",
                background: isActive ? "linear-gradient(135deg,#2563eb 0%,#38bdf8 100%)" : "transparent",
                color: isActive ? "#ffffff" : "#334155",
                fontWeight: isActive ? "600" : "400",
                fontSize:"16px",
                boxShadow: isActive ? "0 4px 12px rgba(37,99,246,.22)" : "none",
                transition:"all .18s ease",
                whiteSpace:"nowrap", overflow:"hidden",
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.background.includes("gradient"))
                  e.currentTarget.style.background = "#e0f0ff";
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.style.background.includes("gradient"))
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {({ isActive }) => (
                <>
                  <span style={{ width:`${ICON_SIZE}px`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity: isActive ? 1 : 0.65 }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── BOTTOM: Account section ── */}
      <div ref={dropdownRef} style={{ position:"relative", borderTop:"1px solid #dbeafe", paddingTop:"14px" }}>

        {/* Dropdown — above the button */}
        {open && (
          <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:0, width: collapsed?"180px":"100%", background:"#ffffff", border:"1px solid #dbeafe", borderRadius:"12px", boxShadow:"0 -4px 20px rgba(37,99,235,.1), 0 8px 24px rgba(0,0,0,.08)", zIndex:9999, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", fontSize:"10px", fontWeight:"700", color:"#94a3b8", borderBottom:"1px solid #f1f5f9", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              My Account
            </div>

            {[
              { to:"/admin/profile", icon:<User size={15}/>,   label:"View Profile" },
              { to:"/admin/settings", icon:<Settings size={15}/>,label:"Settings" },
            ].map((item) => (
              <NavLink key={item.to+item.label} to={item.to} onClick={()=>setOpen(false)}
                style={{ display:"flex", alignItems:"center", gap:"9px", padding:"10px 14px", fontSize:"13px", color:"#334155", textDecoration:"none", transition:"background .15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {item.icon} {item.label}
              </NavLink>
            ))}

            <button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:"9px", padding:"10px 14px", fontSize:"13px", color:"#ef4444", background:"transparent", border:"none", borderTop:"1px solid #f1f5f9", width:"100%", cursor:"pointer", transition:"background .15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#fff1f1"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <LogOut size={15}/> Logout
            </button>
          </div>
        )}

        {/* Avatar trigger */}
        <button onClick={()=>setOpen(!open)} title={collapsed ? (user?.name||"Admin") : ""}
          style={{ display:"flex", alignItems:"center", gap:"10px", width:"100%", padding:"8px 7px", borderRadius:"10px", border:"none", background: open?"#e0f0ff":"transparent", cursor:"pointer", justifyContent:"flex-start", transition:"background .15s" }}
          onMouseEnter={e=>{ if(!open) e.currentTarget.style.background="#e0f0ff"; }}
          onMouseLeave={e=>{ if(!open) e.currentTarget.style.background="transparent"; }}>

          <div style={{ width:`${ICON_SIZE}px`, height:`${ICON_SIZE}px`, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#38bdf8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"700", fontSize:"14px", flexShrink:0, boxShadow:"0 2px 8px rgba(37,99,235,.25)" }}>
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Admin avatar"
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "A"
            )}
          </div>

          {!collapsed && (
            <>
              <div style={{ flex:1, textAlign:"left", minWidth:0 }}>
                <p style={{ margin:0, fontSize:"13px", fontWeight:"600", color:"#1e3a5f", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {user?.name || "Admin"}
                </p>
                <p style={{ margin:0, fontSize:"11px", color:"#64748b", textTransform:"capitalize" }}>
                  {user?.role || "admin"}
                </p>
              </div>
              <svg style={{ width:"14px", height:"14px", color:"#94a3b8", transform: open?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s", flexShrink:0 }}
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </>
          )}
        </button>

        {/* Footer */}
        {!collapsed && (
          <p style={{ margin:"12px 0 0", fontSize:"11px", color:"#94a3b8", textAlign:"center" }}>
            © {new Date().getFullYear()} {siteName}
          </p>
        )}
      </div>
    </aside>
  );
}