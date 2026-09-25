import React from "react";

export default function AppointmentCard({ appointment, actions }) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900">{appointment?.doctor?.user?.name || appointment?.patient?.name || "Appointment"}</p>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">{appointment?.status || "pending"}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{appointment?.date} • {appointment?.time}</p>
      {actions ? <div className="mt-3">{actions}</div> : null}
    </div>
  );
}
