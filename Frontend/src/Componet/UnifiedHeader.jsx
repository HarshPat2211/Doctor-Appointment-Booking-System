import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Loader2 } from "lucide-react";
import API from "../pages/util/api";
import { logout } from "../Redux/authSlice";
import {
  appendDismissedNotificationIds,
  buildStatusNotifications,
  getDismissedNotificationIds
} from "../utils/statusNotifications";
import { getInitials } from "../utils/initials";
import { formatDate } from "../utils/helpers";

export default function UnifiedHeader() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const doctorProfile = useSelector((state) => state.doctor?.profile);
  const avatarUrl = user?.profileImage || (user?.role === "doctor" ? doctorProfile?.profileImage : "");

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      if (!user?.role) return;
      const endpoint = user.role === "doctor" ? "/appointments/doctor" : "/appointments/my";
      const res = await API.get(endpoint);
      const allNotifications = buildStatusNotifications({ appointments: res.data || [], role: user.role }).slice(0, 5);
      const dismissedSet = getDismissedNotificationIds({ userId: user?._id, role: user?.role });
      setNotifications(allNotifications.filter((item) => !dismissedSet.has(item.eventId)));
    } catch {
      console.log("Notifications not available");
    }
  };

  const performClearAll = async () => {
    if (notifications.length === 0) return;
    setIsClearing(true);
    appendDismissedNotificationIds({
      userId: user?._id,
      role: user?.role,
      ids: notifications.map((item) => item.eventId)
    });
    setNotifications([]);
    setIsClearing(false);
  };

  const handleNotificationClick = async (notification) => {
    appendDismissedNotificationIds({
      userId: user?._id,
      role: user?.role,
      ids: [notification.eventId]
    });
    setNotifications((prev) => prev.filter((n) => n.eventId !== notification.eventId));
  };

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      dispatch(logout());
      navigate("/login");
    }
  };

  const unreadCount = notifications.length;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-white via-blue-50 to-blue-100 shadow-sm sticky top-0 z-40">
      {/* Left: Welcome message */}
      <div>
        <h1 className="text-lg font-semibold text-slate-700">
          Welcome back,{" "}
          <span className="text-blue-600">{user?.name || "User"}!</span>
        </h1>
        <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
      </div>

      {/* Right: Notifications + Profile + Logout */}
      <div className="flex items-center gap-5">

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative w-9 h-9 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center hover:bg-blue-50 transition"
          >
            <Bell size={18} className="text-blue-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-blue-100 z-50">
              <div className="p-4 border-b border-blue-50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
                <div className="flex gap-3">
                  {notifications.length > 0 && (
                    <button
                      onClick={performClearAll}
                      disabled={isClearing}
                      className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                    >
                      {isClearing ? <Loader2 size={12} className="animate-spin" /> : "Clear all"}
                    </button>
                  )}
                  <button
                    onClick={fetchNotifications}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleNotificationClick(notif)}
                      className="p-4 border-b border-blue-50 cursor-pointer transition bg-blue-50 hover:bg-blue-100"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-800 font-medium">
                            {notif.message || "New notification"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {notif.createdAt
                              ? formatDate(notif.createdAt, "Just now")
                              : "Just now"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-3 pl-4 border-l border-blue-100">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-9 h-9 rounded-full border border-blue-100 shadow-md object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex items-center justify-center text-white font-bold text-sm">
              {getInitials(user?.name)}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center hover:bg-red-50 hover:border-red-100 transition text-red-500"
          title="Logout"
        >
          <LogOut size={17} />
        </button>

      </div>
    </header>
  );
}