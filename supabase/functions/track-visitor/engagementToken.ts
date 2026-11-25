/** A short-lived capability issued only after the server creates a view. */
const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIFETIME_MS = 86_400_000;

const keyFor = (secret: string) => crypto.subtle.importKey(
  "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
);
const signingData = (viewId: string, expiry: number) => encoder.encode(`analytics-engagement:v1:${viewId}:${expiry}`);

export async function issueEngagementToken(viewId: string, secret: string, now = Date.now()): Promise<string> {
  const expiry = now + LIFETIME_MS;
  const signature = await crypto.subtle.sign("HMAC", await keyFor(secret), signingData(viewId, expiry));
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${expiry}.${hex}`;
}

export async function verifyEngagementToken(viewId: unknown, token: unknown, secret: string, now = Date.now()): Promise<boolean> {
  if (typeof viewId !== "string" || !UUID.test(viewId) || typeof token !== "string") return false;
  const match = /^(\d{13})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (expiry <= now || expiry > now + LIFETIME_MS) return false;
  const bytes = Uint8Array.from(match[2].match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", await keyFor(secret), bytes, signingData(viewId, expiry));
}