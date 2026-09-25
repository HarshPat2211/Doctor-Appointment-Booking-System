export const getInitials = (name = "") => {
  const cleaned = String(name).trim();
  if (!cleaned) return "U";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  const first = parts[0].slice(0, 1).toUpperCase();
  const last = parts[parts.length - 1].slice(0, 1).toUpperCase();
  return `${first}${last}`;
};
