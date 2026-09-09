/**
 * serviceAccountKey — reads the JSON key file Google downloads and says,
 * in words, whether it is the right kind of file. Nothing here talks to
 * a server; it exists so the setup screen can show the account's email
 * (the thing the owner must add in Search Console) before pressing
 * Connect, and can name the usual mistakes.
 */

export type KeyReading =
  | { ok: true; email: string; project: string | null }
  | { ok: false; reason: string };

export const readServiceAccountKey = (text: string): KeyReading => {
  const raw = text.trim();
  if (!raw) return { ok: false, reason: "" };
  let obj: Record<string, unknown>;
  try { obj = JSON.parse(raw) as Record<string, unknown>; }
  catch {
    if (/BEGIN PRIVATE KEY/.test(raw) && !raw.startsWith("{")) return { ok: false, reason: "That is only the private key. Paste the whole file, from the opening { to the closing }." };
    if (/^[A-Za-z0-9._~-]{20,}$/.test(raw)) return { ok: false, reason: "That looks like an API key. Search Console needs a service-account JSON key file, not an API key." };
    return { ok: false, reason: "That is not a JSON file. Open the .json file Google downloaded, select all, copy, and paste it here." };
  }
  if (!obj || typeof obj !== "object") return { ok: false, reason: "That is not a key file." };
  if ("installed" in obj || "web" in obj) return { ok: false, reason: "That is an OAuth client file, not a service-account key. In Google Cloud go to IAM → Service accounts → your account → Keys → Add key." };
  if (obj.type !== "service_account") return { ok: false, reason: `The file says type "${String(obj.type ?? "")}"; a service-account key says "service_account".` };
  const email = typeof obj.client_email === "string" ? obj.client_email : "";
  const key = typeof obj.private_key === "string" ? obj.private_key : "";
  if (!email) return { ok: false, reason: "The file has no client_email." };
  if (!/BEGIN PRIVATE KEY/.test(key)) return { ok: false, reason: "The file has no private_key. Create a new JSON key; Google only lets you download it once." };
  return { ok: true, email, project: typeof obj.project_id === "string" ? obj.project_id : null };
};

/** The Search Console page where users are added, for this site. */
export const searchConsoleUsersUrl = (host: string): string =>
  `https://search.google.com/search-console/users?resource_id=${encodeURIComponent(`sc-domain:${host}`)}`;
