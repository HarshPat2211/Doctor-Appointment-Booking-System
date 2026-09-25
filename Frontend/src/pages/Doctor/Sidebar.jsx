import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home, User, Calendar, BookOpen,
  LogOut, Settings, ChevronLeft, ChevronRight, FileBarChart2,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../Redux/authSlice";
import API from "../util/api";
import { useSiteName } from "../../utils/siteName";

export default function DoctorSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dropdownRef = useRef(null);
  const siteName = useSiteName();
  const siteInitial = siteName.trim().charAt(0).toUpperCase() || "H";

  const { user } = useSelector((state) => state.auth);
  const doctorProfile = useSelector((state) => state.doctor?.profile);
  const avatarUrl = user?.profileImage || doctorProfile?.profileImage || "";

  const navItems = [
    { path: "/doctor", label: "Dashboard", icon: <Home size={18} />, exact: true },
    { path: "/doctor/profile", label: "Profile", icon: <User size={18} /> },
    { path: "/doctor/calendar", label: "Calendar", icon: <Calendar size={18} /> },
    { path: "/doctor/bookings", label: "Bookings", icon: <BookOpen size={18} /> },
    { path: "/doctor/report", label: "Report", icon: <FileBarChart2 size={18} /> },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const ICON_SIZE = 36;

  return (
    <aside
      style={{
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
      }}
    >
      <div>
        {/* ── TOP ROW: Logo + Collapse button ── */}
        <div style={{
          display: "flex", flexDirection: "row",
          alignItems: "center", justifyContent: "space-between",
          marginBottom: "28px", gap: "8px",
        }}>
          {collapsed ? (
            <>
              <div style={{
                width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px`,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: "800", fontSize: "17px", flexShrink: 0,
              }}>{siteInitial}</div>
              <button
                onClick={() => setCollapsed(false)}
                title="Expand sidebar"
                style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: "#2563eb", border: "2px solid #fff",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff", flexShrink: 0, padding: 0,
                }}
              >
                <ChevronRight size={13} />
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: "800", fontSize: "16px", flexShrink: 0,
                }}>{siteInitial}</div>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ fontSize: "15px", fontWeight: "700", color: "#1e3a5f", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {siteName}
                  </h1>
                  <p style={{ fontSize: "10px", color: "#64748b", margin: 0 }}>Doctor Portal</p>
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: "#2563eb", border: "2px solid #fff",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff", flexShrink: 0, padding: 0,
                }}
              >
                <ChevronLeft size={13} />
              </button>
            </>
          )}
        </div>

        {/* Nav label */}
        {!collapsed && (
          <p style={{
            fontSize: "10px", fontWeight: "600", color: "#94a3b8",
            letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: "6px", paddingLeft: "10px",
          }}>
            Main Menu
          </p>
        )}

        {/* Navigation links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {navItems.map((item, i) => {
            const active = isActive(item);
            return (
              <Link
                key={i}
                to={item.path}
                title={collapsed ? item.label : ""}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: collapsed ? "9px 7px" : "9px 12px",
                  borderRadius: "10px", textDecoration: "none",
                  justifyContent: "flex-start",
                  background: active ? "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)" : "transparent",
                  color: active ? "#ffffff" : "#334155",
                  fontWeight: active ? "600" : "400",
                  fontSize: "14px",
                  boxShadow: active ? "0 4px 12px rgba(37,99,246,0.22)" : "none",
                  transition: "all 0.18s ease",
                  whiteSpace: "nowrap", overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  if (!active) { e.currentTarget.style.background = "#e0f0ff"; e.currentTarget.style.color = "#2563eb"; }
                }}
                onMouseLeave={(e) => {
                  if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#334155"; }
                }}
              >
                <span style={{ width: `${ICON_SIZE}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: active ? 1 : 0.65 }}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom: Account section ── */}
      <div ref={dropdownRef} style={{ position: "relative", borderTop: "1px solid #dbeafe", paddingTop: "14px" }}>

        {/* Dropdown — always above the button */}
        {open && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: 0,
            width: collapsed ? "180px" : "100%",
            background: "#ffffff", border: "1px solid #dbeafe",
            borderRadius: "12px",
            boxShadow: "0 -4px 20px rgba(37,99,235,0.1), 0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 9999, overflow: "hidden",
          }}>
            <div style={{ padding: "10px 14px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", borderBottom: "1px solid #f1f5f9", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              My Account
            </div>

            {[
              
            { to: "/doctor/settings", icon: <Settings size={15} />, label: "Account Settings" },
            ].map((item) => (
              <Link
                key={item.to} to={item.to}
                onClick={() => setOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: "9px", padding: "10px 14px", fontSize: "13px", color: "#334155", textDecoration: "none", transition: "background 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f0f7ff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {item.icon} {item.label}
              </Link>
            ))}

            <button
              onClick={async () => {
                try { await API.post("/auth/logout"); } catch (error) { console.error("Logout failed:", error); }
                dispatch(logout());
                navigate("/login");
                setOpen(false);
              }}
              style={{
                display: "flex", alignItems: "center", gap: "9px",
                padding: "10px 14px", fontSize: "13px", color: "#ef4444",
                background: "transparent", border: "none",
                borderTop: "1px solid #f1f5f9", width: "100%",
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fff1f1"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        )}

        {/* Avatar trigger button */}
        <button
          onClick={() => setOpen(!open)}
          title={collapsed ? user?.name || "Doctor" : ""}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            width: "100%", padding: "8px 7px",
            borderRadius: "10px", border: "none",
            background: open ? "#e0f0ff" : "transparent",
            cursor: "pointer", justifyContent: "flex-start",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "#e0f0ff"; }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
        >
          {/* Avatar — fixed width matches nav icons */}
          <div style={{
            width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px`, borderRadius: "50%",
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: "700", fontSize: "14px", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
          }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name || "Doctor"}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "D"
            )}
          </div>

          {!collapsed && (
            <>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#1e3a5f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.name || "Doctor"}
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b", textTransform: "capitalize" }}>
                  {user?.role || "doctor"}
                </p>
              </div>
              <svg style={{ width: "14px", height: "14px", color: "#94a3b8", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}