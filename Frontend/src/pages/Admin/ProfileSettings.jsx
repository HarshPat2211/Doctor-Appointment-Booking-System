import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Camera, Eye, EyeOff, KeyRound, Mail, Save, ShieldCheck, User } from "lucide-react";
import API from "../util/api";
import { loginSuccess } from "../../Redux/authSlice";
import { showToast } from "../../Redux/toastSlice";

const inputStyle = {
  width: "100%",
  padding: "11px 14px 11px 38px",
  borderRadius: "10px",
  border: "1px solid #dbeafe",
  background: "#f8faff",
  fontSize: "14px",
  color: "#1e3a5f",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11px",
  fontWeight: "700",
  color: "#64748b",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

export default function AdminProfileSettings() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await API.get("/auth/verify");
        setName(data?.name || "");
        setEmail(data?.email || "");
        setProfileImage(data?.profileImage || "");
      } catch {
        dispatch(showToast({ message: "Failed to load admin profile", type: "error" }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [dispatch]);

  const resolvedPreview = useMemo(() => {
    if (profileImage?.trim()) return profileImage.trim();
    return "";
  }, [profileImage]);

  useEffect(() => {
    setImageError(false);
  }, [resolvedPreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword && newPassword.length < 6) {
      dispatch(showToast({ message: "Password must be at least 6 characters", type: "warning" }));
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      dispatch(showToast({ message: "Passwords do not match", type: "warning" }));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        profileImage: profileImage.trim(),
      };

      if (newPassword) {
        payload.password = newPassword;
      }

      const { data } = await API.put("/auth/profile", payload);
      dispatch(loginSuccess(data));
      dispatch(showToast({ message: "Admin profile updated", type: "success" }));
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      dispatch(showToast({ message: error?.response?.data?.message || "Failed to update profile", type: "error" }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans','Segoe UI',sans-serif",
          color: "#2563eb",
          fontWeight: "600",
        }}
      >
        Loading admin profile...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 55%, #e8f4ff 100%)",
        padding: "28px",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ marginBottom: "22px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1e3a5f" }}>Admin Profile Settings</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Manage your profile details, avatar, email, and password
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "26px",
              border: "1px solid #dbeafe",
              boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>
                  <User size={11} /> Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <User size={15} />
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter full name"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  <Mail size={11} /> Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter email address"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  <Camera size={11} /> Profile Image URL
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#60a5fa", pointerEvents: "none" }}>
                      <Camera size={15} />
                    </span>
                    <input
                      value={profileImage}
                      onChange={(e) => setProfileImage(e.target.value)}
                      placeholder="Paste an image URL (https://...)"
                      style={inputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#93c5fd";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#dbeafe";
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: "58px",
                      height: "58px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid #dbeafe",
                      background: "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#1d4ed8",
                      fontWeight: "700",
                    }}
                  >
                    {resolvedPreview && !imageError ? (
                      <img
                        src={resolvedPreview}
                        alt="Admin avatar"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={() => {
                          setImageError(true);
                        }}
                      />
                    ) : (
                      (user?.name || name || "A").charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "26px",
              border: "1px solid #dbeafe",
              boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                }}
              >
                <KeyRound size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>Change Password</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave empty to keep same"
                    style={{ ...inputStyle, paddingLeft: "14px", paddingRight: "38px" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={{ ...inputStyle, paddingLeft: "14px", paddingRight: "38px" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#93c5fd";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dbeafe";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 18px",
                borderRadius: "10px",
                border: "none",
                background: saving ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#38bdf8)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 6px 18px rgba(37,99,235,.28)",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
