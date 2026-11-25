/**
 * Hero badge text helper (owner, 25 Nov 2026): a badge written
 * "Internal Comms Audit · From €900 + VAT" shows the price on its own
 * line, larger. It only splits what the owner wrote; no word is added
 * or dropped. The split is at the LAST " · ", and only when the part
 * after it starts with "From", so any other badge comes back whole.
 */
export const splitBadgePrice = (text: string): { lead: string; price: string } => {
  const value = typeof text === "string" ? text.trim() : "";
  const at = value.lastIndexOf(" · ");
  if (at < 0) return { lead: value, price: "" };
  const price = value.slice(at + 3).trim();
  if (!/^From\b/.test(price)) return { lead: value, price: "" };
  return { lead: value.slice(0, at).trim(), price };
};
