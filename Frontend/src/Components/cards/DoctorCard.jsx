import React from "react";
import DoctorAvatar from "../../Componet/DoctorAvatar";
//import Button from "../common/Button";

export default function DoctorCard({ doctor, onViewProfile, onBook }) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <DoctorAvatar doctor={doctor} size="w-12 h-12" />
        <div className="flex-1">
          <p className="font-semibold text-gray-900">Dr. {doctor?.user?.name || "Doctor"}</p>
          <p className="text-sm text-blue-700">{doctor?.specialization || "Specialist"}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="secondary" className="flex-1" onClick={onViewProfile}>View Profile</Button>
        <Button className="flex-1" onClick={onBook}>Book</Button>
      </div>
    </div>
  );
}
