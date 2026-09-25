// src/App.jsx
import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { verifyAuth } from "./services/authService";
import { loginSuccess, logout } from "./Redux/authSlice";
import { showToast } from "./Redux/toastSlice";
import ToastContainer from "./Componet/ToastContainer";
import { initializeSocket, disconnectSocket, getSocket } from "./utils/socket";
import AppRoutes from "./Routes/AppRoutes";

function App() {
  const dispatch = useDispatch();

  // Check if user is authenticated on app load (from cookie)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await verifyAuth();
        dispatch(loginSuccess(data));
      } catch (error) {
        console.log("Not authenticated:", error.message);
      }
    };
    checkAuth();

    // 🔴 NEW: Initialize Socket.io connection
    initializeSocket();
    const socket = getSocket();

    const handleAccountDeleted = (data) => {
      try {
        const currentAuth = JSON.parse(localStorage.getItem("auth") || "{}");
        const currentUserId = currentAuth?.user?._id;
        if (data?.userId && currentUserId && String(data.userId) === String(currentUserId)) {
          dispatch(logout());
          dispatch(showToast({ message: data.message || "Your account has been deleted by an administrator", type: "error" }));
          setTimeout(() => {
            window.location.href = "/login";
          }, 1200);
        }
      } catch (err) {
        console.error("Failed handling account deleted:", err);
      }
    };

    socket.on("adminAccountDeleted", handleAccountDeleted);

    // Cleanup on unmount
    return () => {
      socket.off("adminAccountDeleted", handleAccountDeleted);
      disconnectSocket();
    };
  }, [dispatch]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
