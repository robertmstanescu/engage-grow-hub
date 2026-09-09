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

/** A query answers with the report, or simply says the engine is not connected. */
export type SearchQueryResult = SearchReport | { notConnected: true };
export const isNotConnected = (r: SearchQueryResult): r is { notConnected: true } => "notConnected" in r;

const call = async <T,>(fn: string, body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let message = error.message || "Request failed";
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx && typeof ctx.json === "function") { const b = await ctx.json(); if (b?.error) message = b.error; }
    } catch { /* keep message */ }
    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>) && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as T;
};

export const gsc = {
  status: () => call<EngineStatus>("search-console", { action: "status" }),
  connect: (serviceAccountJson: string) => call<EngineStatus>("search-console", { action: "connect", serviceAccountJson }),
  disconnect: () => call<EngineStatus>("search-console", { action: "disconnect" }),
  query: (days = 28) => call<SearchQueryResult>("search-console", { action: "query", days }),
};

export const bing = {
  status: () => call<EngineStatus>("bing-webmaster", { action: "status" }),
  connect: (apiKey: string) => call<EngineStatus>("bing-webmaster", { action: "connect", apiKey }),
  disconnect: () => call<EngineStatus>("bing-webmaster", { action: "disconnect" }),
  query: (days = 28) => call<SearchQueryResult>("bing-webmaster", { action: "query", days }),
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
