import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const RELOAD_GUARD_KEY = "__tmc_bundle_reload__";
const DEPLOYMENT_CHECK_TIMEOUT_MS = 2000;
const CURRENT_BUNDLE_PATH = new URL(import.meta.url).pathname;

/**
 * Production bundles are emitted by Vite as `/assets/index-<hash>.js`.
 * Dev/preview serves `/src/main.tsx`. We only want to self-heal when BOTH
 * the running bundle and the freshly fetched HTML reference real hashed
 * production assets — otherwise we risk an infinite refresh loop in any
 * non-production context.
 */
const PROD_BUNDLE_PATTERN = /^\/assets\/[^/]+\.js$/;

function isProdBundlePath(path: string | null): path is string {
  return Boolean(path && PROD_BUNDLE_PATTERN.test(path));
}

function extractLatestBundlePath(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const scripts = Array.from(doc.querySelectorAll('script[type="module"][src]'));

  for (const script of scripts) {
    const src = script.getAttribute("src");
    if (!src) continue;

    try {
      const path = new URL(src, window.location.origin).pathname;
      if (isProdBundlePath(path)) return path;
    } catch {
      // Ignore malformed URLs and continue searching.
    }
  }

  return null;
}

async function selfHealStaleDeployment(): Promise<void> {
  if (typeof window === "undefined") return;

  // Only run the check when the currently executing bundle is itself a
  // production hashed asset. In dev/preview this is a no-op.
  if (!isProdBundlePath(CURRENT_BUNDLE_PATH)) return;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEPLOYMENT_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${window.location.origin}/`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "cache-control": "no-cache" },
      signal: controller.signal,
    });

    const latestHtml = await response.text();
    const latestBundlePath = extractLatestBundlePath(latestHtml);

    // No hashed bundle reference in the latest HTML → can't compare safely.
    if (!latestBundlePath) return;

    if (latestBundlePath === CURRENT_BUNDLE_PATH) {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === latestBundlePath) {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
      }
      return;
    }

    // Guard against infinite reload loops — only refresh once per stale
    // deployment, then stop until the user navigates again.
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === latestBundlePath) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, latestBundlePath);

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

    const refreshUrl = new URL(window.location.href);
    refreshUrl.searchParams.set("__refresh", latestBundlePath.split("/").pop() ?? "latest");
    window.location.replace(refreshUrl.toString());
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.warn("Bundle freshness check failed", error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function bootstrap(): Promise<void> {
  await selfHealStaleDeployment();
  createRoot(document.getElementById("root")!).render(<App />);

  // Clean up any stray `?__refresh=...` query param so the URL stays tidy
  // after a successful reload.
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    if (url.searchParams.has("__refresh")) {
      url.searchParams.delete("__refresh");
      window.history.replaceState(null, "", url.toString());
    }
  }
}

void bootstrap();
