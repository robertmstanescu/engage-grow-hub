/**
 * Text helpers for the tier card: they only split what the owner wrote
 * into the parts the card lays out. No word is added or dropped.
 */
const DONE_MARKER = /\bDone looks like(?:,[^:]{0,40})?:\s*/i;

/** Split "…text. Done looks like: outcome." into its two halves. */
export const splitDoneLooksLike = (description: string): { lead: string; label: string; done: string } => {
  const text = typeof description === "string" ? description : "";
  const match = DONE_MARKER.exec(text);
  if (!match) return { lead: text, label: "", done: "" };
  return {
    lead: text.slice(0, match.index).trim(),
    label: match[0].trim(),
    done: text.slice(match.index + match[0].length).trim(),
  };
};

/** Split "From €900 · 2–3 weeks" into the headline price and the rest. */
export const splitPriceLine = (time: string): { price: string; detail: string } => {
  const text = typeof time === "string" ? time.trim() : "";
  const at = text.indexOf("·");
  if (at < 0) return { price: text, detail: "" };
  return { price: text.slice(0, at).trim(), detail: text.slice(at + 1).trim() };
};
