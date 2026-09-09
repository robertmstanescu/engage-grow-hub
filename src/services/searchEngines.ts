import { supabase } from "@/integrations/supabase/client";

/**
 * searchEngines — the admin's view of Google Search Console, Bing
 * Webmaster Tools and IndexNow, through three edge functions. Secrets
 * never reach the browser: the functions store them and answer with
 * status and numbers only.
 */

export interface EngineStatus { connected: boolean; host: string; siteUrl?: string | null; clientEmail?: string; since?: string }

export interface SearchRow { query?: string; page?: string; country?: string; clicks: number; impressions: number; ctr?: number; position?: number }
export interface SearchReport {
  siteUrl: string; startDate: string; endDate: string;
  totals: { clicks: number; impressions: number; ctr: number; position?: number };
  byDate: Array<{ date: string; clicks: number; impressions: number }>;
  byQuery: SearchRow[]; byPage: SearchRow[]; byCountry?: SearchRow[];
}

/**
 * An engine said no. `sites` is filled when the key worked but the site
 * was not among the properties it can see, so the setup screen can show
 * what the account does have access to.
 */
export class EngineError extends Error {
  sites?: string[];
  constructor(message: string, sites?: string[]) { super(message); this.name = "EngineError"; this.sites = sites; }
}

const call = async <T,>(fn: string, body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let message = error.message || "Request failed";
    let sites: string[] | undefined;
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string; sites?: string[] }> } }).context;
      if (ctx && typeof ctx.json === "function") {
        const b = await ctx.json();
        if (b?.error) message = b.error;
        if (Array.isArray(b?.sites)) sites = b.sites.map(String);
      }
    } catch { /* keep message */ }
    throw new EngineError(message, sites);
  }
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>) && (data as { error?: string }).error) {
    const d = data as { error: string; sites?: string[] };
    throw new EngineError(d.error, Array.isArray(d.sites) ? d.sites.map(String) : undefined);
  }
  return data as T;
};

export const gsc = {
  status: () => call<EngineStatus>("search-console", { action: "status" }),
  connect: (serviceAccountJson: string) => call<EngineStatus>("search-console", { action: "connect", serviceAccountJson }),
  disconnect: () => call<EngineStatus>("search-console", { action: "disconnect" }),
  query: (days = 28) => call<SearchReport>("search-console", { action: "query", days }),
};

export const bing = {
  status: () => call<EngineStatus>("bing-webmaster", { action: "status" }),
  connect: (apiKey: string) => call<EngineStatus>("bing-webmaster", { action: "connect", apiKey }),
  disconnect: () => call<EngineStatus>("bing-webmaster", { action: "disconnect" }),
  query: (days = 28) => call<SearchReport>("bing-webmaster", { action: "query", days }),
};

export const INDEXNOW_KEY = "9f4c1e7a2b8d4e6f9a0c3b5d7e1f2a4b";

export const indexNow = {
  submit: (urls: string[]) => call<{ submitted: number }>("indexnow", { urls }),
  submitAll: () => call<{ submitted: number }>("indexnow", { all: true }),
};

/** Fire-and-forget after a publish; never blocks or throws. */
export const notifyIndexNow = (paths: string[]): void => {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!/themagiccoffin\.com$/.test(new URL(origin).host)) return; // previews never ping
    const urls = paths.map((p) => `${origin}${p.startsWith("/") ? p : `/${p}`}`);
    void indexNow.submit(urls).catch(() => {});
  } catch { /* ignore */ }
};
