import React from "react";

export default function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm text-gray-700 mb-1">{label}</span>}
      <input
        className={`w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
        {...props}
      />
    </label>
  );
}
