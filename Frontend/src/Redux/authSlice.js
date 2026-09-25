// src/Redux/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

const PROFILE_CACHE_KEY = "userProfileCache";

const readProfileCache = () => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeProfileCache = (cache) => {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // no-op
  }
};

const pickNonEmpty = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      if (value.trim() === "") continue;
      return value;
    }
    return value;
  }
  return "";
};

const pickMedicalHistory = (...values) => {
  for (const value of values) {
    if (!value || typeof value !== "object") continue;
    const keys = ["bloodGroup", "allergies", "chronicDiseases", "pastSurgeries", "currentMedications"];
    const hasAny = keys.some((key) => String(value[key] || "").trim() !== "");
    if (hasAny) return value;
  }
  return {};
};

const upsertProfileCache = (user) => {
  const emailKey = String(user?.email || "").trim().toLowerCase();
  if (!emailKey) return;
  const cache = readProfileCache();
  cache[emailKey] = {
    _id: user?._id ?? null,
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? null,
    profileImage: user?.profileImage ?? "",
    medicalHistory: user?.medicalHistory ?? {},
    age: user?.age ?? "",
    gender: user?.gender ?? "",
    mobileNumber: user?.mobileNumber ?? "",
    residentialAddress: user?.residentialAddress ?? "",
  };
  writeProfileCache(cache);
};

// ✅ Initialize from localStorage
const storedAuth = localStorage.getItem("auth");
let initialUser = null;
let initialToken = null;

if (storedAuth) {
  try {
    const parsed = JSON.parse(storedAuth);
    initialUser = parsed.user;
    initialToken = parsed.token;
  } catch (e) {
    console.error("Failed to parse stored auth:", e);
    localStorage.removeItem("auth");
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,
  },
  reducers: {
    loginSuccess: (state, action) => {
      // ✅ Backend returns: { _id, name, email, role, token }
      const {
        _id,
        name,
        email,
        role,
        token,
        profileImage,
        medicalHistory,
        age,
        gender,
        mobileNumber,
        residentialAddress,
      } = action.payload;

      const prevUser = state.user || {};
      const normalizedEmail = String(email ?? prevUser.email ?? "").trim().toLowerCase();
      const prevEmail = String(prevUser.email || "").trim().toLowerCase();
      const shouldUsePrevUser = !normalizedEmail || prevEmail === normalizedEmail;
      const safePrevUser = shouldUsePrevUser ? prevUser : {};

      const cachedProfile = normalizedEmail ? (readProfileCache()[normalizedEmail] || {}) : {};

      const mappedUser = {
        _id: _id ?? safePrevUser._id ?? cachedProfile._id ?? null,
        name: pickNonEmpty(name, safePrevUser.name, cachedProfile.name),
        email: pickNonEmpty(email, safePrevUser.email, cachedProfile.email),
        role: role ?? safePrevUser.role ?? cachedProfile.role ?? null,
        profileImage: pickNonEmpty(profileImage, safePrevUser.profileImage, cachedProfile.profileImage),
        medicalHistory: pickMedicalHistory(medicalHistory, safePrevUser.medicalHistory, cachedProfile.medicalHistory),
        age: pickNonEmpty(age, safePrevUser.age, cachedProfile.age),
        gender: pickNonEmpty(gender, safePrevUser.gender, cachedProfile.gender),
        mobileNumber: pickNonEmpty(mobileNumber, safePrevUser.mobileNumber, cachedProfile.mobileNumber),
        residentialAddress: pickNonEmpty(residentialAddress, safePrevUser.residentialAddress, cachedProfile.residentialAddress),
      };
      
      state.user = mappedUser;
      state.token = token ?? state.token;
      state.isAuthenticated = true;

      upsertProfileCache(mappedUser);

      // ✅ Store as single object
      localStorage.setItem("auth", JSON.stringify({
        user: mappedUser,
        token: token ?? state.token
      }));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("auth");
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      upsertProfileCache(state.user);
      localStorage.setItem("auth", JSON.stringify({
        user: state.user,
        token: state.token
      }));
    }
  },
});

export const { loginSuccess, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;