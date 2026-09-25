export const formatDate = (value, fallback = "") => {
  if (!value) return fallback;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    const dd = String(value.getDate()).padStart(2, "0");
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const yyyy = value.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const raw = String(value).trim();
  if (!raw) return fallback;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    return `${isoDateOnly[3]}/${isoDateOnly[2]}/${isoDateOnly[1]}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return fallback;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const classNames = (...classes) => classes.filter(Boolean).join(" ");
