import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const DEPLOYMENT_STORAGE_KEY = "__tmc_deployment_id__";
const RELOAD_GUARD_KEY = "__tmc_deployment_reload__";
const DEPLOYMENT_CHECK_TIMEOUT_MS = 1500;

function readDeploymentCookie() {
  const match = document.cookie.match(/(?:^|;\s*)__dpl=([^;]+)/);
  return match?.[1] ?? null;
}

async function selfHealStaleDeployment() {
  if (typeof window === "undefined") return;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEPLOYMENT_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${window.location.origin}/`, {
      method: "HEAD",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "cache-control": "no-cache",
      },
      signal: controller.signal,
    });

    const liveDeploymentId = response.headers.get("x-deployment-id");
    if (!liveDeploymentId) return;

    const cookieDeploymentId = readDeploymentCookie();
    const storedDeploymentId = localStorage.getItem(DEPLOYMENT_STORAGE_KEY);
    const knownDeploymentId = cookieDeploymentId || storedDeploymentId;
    const needsRefresh = Boolean(knownDeploymentId && knownDeploymentId !== liveDeploymentId);

    localStorage.setItem(DEPLOYMENT_STORAGE_KEY, liveDeploymentId);

    if (!needsRefresh) {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === liveDeploymentId) {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
      }
      return;
    }

    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === liveDeploymentId) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, liveDeploymentId);

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

    const refreshUrl = new URL(window.location.href);
    refreshUrl.searchParams.set("__refresh", liveDeploymentId.slice(0, 8));
    window.location.replace(refreshUrl.toString());
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.warn("Deployment freshness check failed", error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function bootstrap() {
  await selfHealStaleDeployment();
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
