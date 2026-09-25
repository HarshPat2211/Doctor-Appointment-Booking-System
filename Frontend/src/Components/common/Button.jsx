import React from "react";

export default function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  ...props
}) {
  const base = "inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border border-blue-200 text-blue-800 hover:bg-blue-50",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };

  return (
    <button type={type} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
