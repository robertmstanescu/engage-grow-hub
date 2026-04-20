/**
 * Vite plugin: replaces every `?v=BUILD_HASH` placeholder in index.html
 * with a fresh content hash on each build, AND in dev with a per-server
 * timestamp.
 *
 * Why: Safari + Cloudflare aggressively cache `index.html` and the URLs
 * it references. A static `?v=nuclear_v4` only works once — every later
 * deploy ships the same string, so the browser thinks "I already have
 * /src/main.tsx?v=nuclear_v4 in disk cache" and never refetches. Using
 * a build-time hash GUARANTEES the URL changes whenever the source
 * changes, forcing a redownload exactly when (and only when) needed.
 */
import type { Plugin } from "vite";
import { createHash } from "node:crypto";

export function injectBuildHash(): Plugin {
  // One hash per build invocation. In dev it's the boot timestamp so
  // restarting the dev server also busts the cache.
  const hash =
    process.env.NODE_ENV === "production"
      ? createHash("sha256")
          .update(String(Date.now()))
          .update(String(Math.random()))
          .digest("hex")
          .slice(0, 12)
      : `dev-${Date.now()}`;

  return {
    name: "inject-build-hash",
    transformIndexHtml(html) {
      return html.replaceAll("BUILD_HASH", hash);
    },
  };
}
