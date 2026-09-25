import React from "react";

export default function Modal({ isOpen, onClose, children, backdropClassName = "bg-blue-900/20 backdrop-blur-sm" }) {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[10000] ${backdropClassName} flex items-center justify-center p-4`}>
      <div className="w-full max-w-lg bg-white rounded-2xl border border-blue-100 shadow-xl">
        {children}
      </div>
      <button aria-label="Close" className="hidden" onClick={onClose} />
    </div>
  );
}
