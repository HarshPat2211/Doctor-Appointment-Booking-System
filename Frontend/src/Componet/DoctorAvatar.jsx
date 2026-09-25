import React from "react";

export default function DoctorAvatar({
  doctor,
  size = "w-24 h-24",
  textClass = "text-xl",
  borderClass = "",
}) {
  const name = doctor?.user?.name || "Doctor";

  // GET INITIALS (First + Last)
  const getInitials = (name) => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0][0];
    }
    return parts[0][0] + parts[parts.length - 1][0];
  };

  const initials = getInitials(name).toUpperCase();

  const imageUrl = doctor?.profileImage || doctor?.user?.profileImage || doctor?.image || "";
  const hasImage = Boolean(imageUrl);

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-bold ${borderClass}`}
    >
      {hasImage ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center rounded-full 
          bg-blue-600 text-white ${textClass}`}
        >
          {initials}
        </div>
      )}
    </div>
  );
}