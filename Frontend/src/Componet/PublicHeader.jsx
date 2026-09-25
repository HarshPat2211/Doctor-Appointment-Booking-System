import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteName } from "../utils/siteName";

export default function PublicHeader({ sticky = false }) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const siteName = useSiteName();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        background: scrolled ? "rgba(255,255,255,0.95)" : "#ffffff",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid #dbeafe" : "1px solid #f1f5f9",
        boxShadow: scrolled ? "0 4px 20px rgba(37,99,235,0.08)" : "none",
        position: sticky ? "sticky" : "relative",
        top: 0,
        zIndex: 50,
        transition: "all 0.25s ease",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* ── LOGO ── */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "800", fontSize: "17px",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              flexShrink: 0,
            }}
          >
            H
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#1e3a5f", fontFamily: "'Sora', 'DM Sans', sans-serif" }}>
              {siteName}
            </p>
            <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>Care that makes you smile</p>
          </div>
        </Link>

        {/* ── NAV LINKS ── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          className="hidden-mobile"
        >
          <style>{`
            @media (max-width: 768px) { .hidden-mobile { display: none !important; } }
          `}</style>

          {[
            { to: "/how-it-works", label: "How it Works" },
            { to: "/browse-doctors", label: "Browse Doctors" },
            { to: "/doctor-registration/step1", label: "Become a Doctor" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: isActive(item.to) ? "700" : "500",
                color: isActive(item.to) ? "#2563eb" : "#475569",
                background: isActive(item.to) ? "#eff6ff" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
                border: isActive(item.to) ? "1px solid #bfdbfe" : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.to)) {
                  e.currentTarget.style.background = "#f8faff";
                  e.currentTarget.style.color = "#2563eb";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.to)) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#475569";
                }
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ── AUTH BUTTONS ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            to="/login"
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#2563eb",
              textDecoration: "none",
              border: "1px solid #dbeafe",
              background: "#f8faff",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#eff6ff";
              e.currentTarget.style.borderColor = "#93c5fd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f8faff";
              e.currentTarget.style.borderColor = "#dbeafe";
            }}
          >
            Sign in
          </Link>

          <Link
            to="/signup"
            style={{
              padding: "8px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "700",
              color: "#fff",
              textDecoration: "none",
              background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
              transition: "all 0.2s ease",
              border: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.42)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.3)";
              e.currentTarget.style.transform = "none";
            }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}