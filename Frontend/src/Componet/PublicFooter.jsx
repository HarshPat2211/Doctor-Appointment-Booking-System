import React from "react";
import { Link } from "react-router-dom";
import { useSiteName, useSiteEmail } from "../utils/siteName";

export default function PublicFooter() {
  const siteName = useSiteName();
  const siteInitial = siteName.trim().charAt(0).toUpperCase() || "H";
  const siteEmail = useSiteEmail();

  return (
    <footer style={{ background: "#0f172a", padding: "52px 24px 28px", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "36px", marginBottom: "36px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: "15px",
                }}
              >
                {siteInitial}
              </div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#fff", fontFamily: "'Sora',sans-serif" }}>
                {siteName}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Care that makes you smile</p>
          </div>

          {[
            {
              heading: "Quick Links",
              links: [
                { to: "/", label: "Home" },
                { to: "/how-it-works", label: "How it Works" },
                { to: "/signup", label: "Sign Up" },
              ],
            },
            {
              heading: "For Users",
              links: [
                { to: "/login", label: "Sign In" },
                { to: "/privacy", label: "Privacy Policy" },
                { to: "/terms", label: "Terms of Service" },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {col.heading}
              </p>
              {col.links.map((linkItem) => (
                <div key={linkItem.to} style={{ marginBottom: "8px" }}>
                  <Link
                    to={linkItem.to}
                    style={{ fontSize: "13px", color: "#64748b", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#64748b";
                    }}
                  >
                    {linkItem.label}
                  </Link>
                </div>
              ))}
            </div>
          ))}

          <div>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Contact
            </p>
            {[siteEmail, "1-800-HEALTH-1", "Available 24/7"].map((contact) => (
              <p key={contact} style={{ margin: "0 0 8px", fontSize: "13px", color: "#64748b" }}>
                {contact}
              </p>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: "24px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
            Copyright {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}