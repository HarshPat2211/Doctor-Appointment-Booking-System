import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../pages/Patient/PatientSidebar";
import UnifiedHeader from "../Componet/UnifiedHeader";

const PatientLayout = () => {
  const location = useLocation();
  const hideShell = location.pathname.startsWith("/patient/doctor/");

  if (hideShell) {
    return (
      <div className="min-h-screen bg-white">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <UnifiedHeader />

        {/* Dynamic content (Dashboard, Bookings, etc.) */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PatientLayout;
