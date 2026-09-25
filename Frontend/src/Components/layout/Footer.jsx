import React from "react";

export default function Footer() {
  return (
    <footer className="py-4 text-center text-xs text-gray-500 border-t bg-white">
      © {new Date().getFullYear()} Doctor Appointment Booking System
    </footer>
  );
}
