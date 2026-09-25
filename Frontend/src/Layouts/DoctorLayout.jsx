// src/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../pages/Doctor/Sidebar";
import UnifiedHeader from "../Componet/UnifiedHeader";

export default function DoctorLayout() {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar stays on the left */}
      <Sidebar />

      {/* Right side: Header + main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header at the top */}
        <UnifiedHeader />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
