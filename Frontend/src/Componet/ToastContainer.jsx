import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeToast } from "../Redux/toastSlice";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export default function ToastContainer() {
  const notifications = useSelector((state) => state.toast.notifications);
  const dispatch = useDispatch();

  const timersRef = useRef({});

  useEffect(() => {
    // Create timers only for notifications that don't already have one
    notifications.forEach((notif) => {
      if (timersRef.current[notif.id]) return;

      const duration = notif.duration || 3000;
      const t = setTimeout(() => {
        dispatch(removeToast(notif.id));
        // cleanup this timer reference after removal
        delete timersRef.current[notif.id];
      }, duration);

      timersRef.current[notif.id] = t;
    });

    // Clear timers for notifications that were removed
    const existingIds = notifications.map((n) => n.id);
    Object.keys(timersRef.current).forEach((id) => {
      if (!existingIds.includes(Number(id))) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    });

    // cleanup on unmount
    return () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
      timersRef.current = {};
    };
  }, [notifications, dispatch]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} className="text-green-500" />;
      case "error":
        return <AlertCircle size={20} className="text-red-500" />;
      case "warning":
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case "info":
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case "success":
        return "bg-white border-l-4 border-green-400";
      case "error":
        return "bg-white border-l-4 border-red-400";
      case "warning":
        return "bg-white border-l-4 border-yellow-400";
      case "info":
      default:
        return "bg-white border-l-4 border-blue-400";
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "warning":
        return "text-yellow-800";
      case "info":
      default:
        return "text-blue-800";
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] space-y-3 max-w-sm">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`flex items-start gap-3 p-4 rounded-xl bg-white shadow-lg animate-slide-in ${getBgColor(
            notif.type
          )}`}
        >
          <div className="flex-shrink-0 pt-0.5">{getIcon(notif.type)}</div>

          <div className="flex-1">
            <p className={`text-sm font-semibold ${getTextColor(notif.type)}`}>
              {notif.title || (notif.type === 'info' ? 'Notice' : notif.type)}
            </p>
            <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div
                className="bg-yellow-500 h-1"
                style={{ width: `${Math.min(100, ((notif.duration||3000)/3000)*100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => dispatch(removeToast(notif.id))}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 ml-3"
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.28s cubic-bezier(.2,.8,.2,1); }
      `}</style>
    </div>
  );
}
