import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL // ✅ your backend base URL
});

// Configure axios to send cookies with every request
API.defaults.withCredentials = true;

// 🧠 Add token automatically for logged-in users
API.interceptors.request.use((req) => {
  // Try to get token from localStorage first (auth object)
  let token = null;
  try {
    const authStr = localStorage.getItem("auth");
    if (authStr) {
      const auth = JSON.parse(authStr);
      token = auth?.token;
      if (token) {
        console.log("✅ Token found, attaching to request");
        req.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("⚠️  No token in auth object");
      }
    } else {
      console.warn("⚠️  No auth object in localStorage");
    }
  } catch (e) {
    console.error("❌ Failed to parse auth from localStorage:", e);
  }

  return req;
});

export default API;


