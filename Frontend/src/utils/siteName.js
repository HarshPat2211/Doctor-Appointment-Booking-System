import { useEffect, useState } from "react";

const DEFAULT_SITE_NAME = "Happy Health";
const DEFAULT_SITE_EMAIL = "support@happyhealth.com";

export const getSiteName = () => {
  const stored = localStorage.getItem("siteName");
  return stored && stored.trim() ? stored.trim() : DEFAULT_SITE_NAME;
};

export const setSiteName = (name) => {
  const clean = (name || "").trim() || DEFAULT_SITE_NAME;
  localStorage.setItem("siteName", clean);
  window.dispatchEvent(new Event("site-name-updated"));
  return clean;
};

export const getSiteEmail = () => {
  const stored = localStorage.getItem("siteEmail");
  const clean = (stored || "").trim().toLowerCase();
  if (!clean || clean !== DEFAULT_SITE_EMAIL) {
    localStorage.setItem("siteEmail", DEFAULT_SITE_EMAIL);
    return DEFAULT_SITE_EMAIL;
  }
  return DEFAULT_SITE_EMAIL;
};

export const setSiteEmail = (email) => {
  const clean = (email || "").trim() || DEFAULT_SITE_EMAIL;
  localStorage.setItem("siteEmail", clean);
  window.dispatchEvent(new Event("site-email-updated"));
  return clean;
};

export const useSiteName = () => {
  const [name, setName] = useState(getSiteName());

  useEffect(() => {
    const handler = () => setName(getSiteName());
    window.addEventListener("site-name-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("site-name-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    document.title = `${name} - Doctor Appointment System`;
  }, [name]);

  return name;
};

export const useSiteEmail = () => {
  const [email, setEmail] = useState(getSiteEmail());

  useEffect(() => {
    const handler = () => setEmail(getSiteEmail());
    window.addEventListener("site-email-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("site-email-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return email;
};
