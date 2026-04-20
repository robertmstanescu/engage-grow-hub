import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const RELOAD_GUARD_KEY = "__tmc_bundle_reload__";
const DEPLOYMENT_CHECK_TIMEOUT_MS = 2000;
const CURRENT_BUNDLE_PATH = new URL(import.meta.url).pathname;

function extractLatestBundlePath(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const moduleScript = doc.querySelector('script[type="module"][src]');
  const src = moduleScript?.getAttribute("src");

  if (!src) return null;

  try {
    return new URL(src, window.location.origin).pathname;
  } catch {
    return null;
  }
}

async function selfHealStaleDeployment() {
  if (typeof window === "undefined") return;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEPLOYMENT_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${window.location.origin}/`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "cache-control": "no-cache",
      },
      signal: controller.signal,
    });

    const latestHtml = await response.text();
    const latestBundlePath = extractLatestBundlePath(latestHtml);

    if (!latestBundlePath || latestBundlePath === CURRENT_BUNDLE_PATH) {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === latestBundlePath) {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
      }
      return;
    }

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

async function bootstrap() {
  await selfHealStaleDeployment();
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
