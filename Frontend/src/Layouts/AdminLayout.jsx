import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../pages/Admin/Sidebar";
import UnifiedHeader from "../Componet/UnifiedHeader";

export default function AdminLayout() {
  const location = useLocation();
  const isPatientProfileView = location.pathname.startsWith("/admin/patients/");
  const isAppointmentDetailView = location.pathname.startsWith("/admin/appointments/");

  if (isPatientProfileView || isAppointmentDetailView) {
    return (
      <div className="min-h-screen bg-white">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <UnifiedHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
