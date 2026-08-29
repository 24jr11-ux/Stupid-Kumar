// Formats an ISO date string (YYYY-MM-DD) as a friendly long date, e.g.
// "May 14, 2024". Deterministic across server and client.
export function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}