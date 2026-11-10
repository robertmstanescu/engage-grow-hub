/**
 * shortDate — "09 Sep 2026", the date form on every artboard.
 *
 * Written by hand because `toLocaleDateString("en-GB", { month: "short" })`
 * gives "Sept" in some browsers and "Sep" in others, and reads the
 * visitor's time zone. A value that is not a date gives an empty string.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
