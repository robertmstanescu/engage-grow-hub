import { supabase } from "@/integrations/supabase/client";
import type { AnalyticsRangeFilter } from "./unifiedAnalytics";

/**
 * channels — where people came from, in words a person uses.
 *
 * Raw referrers arrive as hosts (www.linkedin.com, l.instagram.com,
 * android-app://com.linkedin.android). Here they become a channel
 * (Search, Social, Referral, Direct) and a named source (LinkedIn,
 * Google…), counted in people rather than page views.
 */

export type Channel = "Search" | "Social" | "Referral" | "Direct";

const SOURCES: Array<{ test: RegExp; label: string; channel: Channel }> = [
  { test: /(^|\.)google\.[a-z.]+$|^com\.google\.android/i, label: "Google", channel: "Search" },
  { test: /(^|\.)bing\.com$/i, label: "Bing", channel: "Search" },
  { test: /(^|\.)duckduckgo\.com$/i, label: "DuckDuckGo", channel: "Search" },
  { test: /(^|\.)yahoo\.[a-z.]+$/i, label: "Yahoo", channel: "Search" },
  { test: /(^|\.)ecosia\.org$/i, label: "Ecosia", channel: "Search" },
  { test: /(^|\.)linkedin\.com$|^lnkd\.in$|^com\.linkedin\.android/i, label: "LinkedIn", channel: "Social" },
  { test: /(^|\.)facebook\.com$|^fb\.me$|^com\.facebook\.katana/i, label: "Facebook", channel: "Social" },
  { test: /(^|\.)instagram\.com$|^com\.instagram\.android/i, label: "Instagram", channel: "Social" },
  { test: /(^|\.)twitter\.com$|^t\.co$|(^|\.)x\.com$/i, label: "X", channel: "Social" },
  { test: /(^|\.)youtube\.com$|^youtu\.be$/i, label: "YouTube", channel: "Social" },
  { test: /(^|\.)reddit\.com$/i, label: "Reddit", channel: "Social" },
  { test: /(^|\.)threads\.net$/i, label: "Threads", channel: "Social" },
  { test: /(^|\.)whatsapp\.com$|^com\.whatsapp$/i, label: "WhatsApp", channel: "Social" },
  { test: /(^|\.)t\.me$|(^|\.)telegram\.org$/i, label: "Telegram", channel: "Social" },
];

/** Host of a referrer, incl. `android-app://com.linkedin.android` → `com.linkedin.android`. */
export const referrerHost = (referrer: string | null | undefined): string => {
  if (!referrer) return "";
  const m = referrer.match(/^android-app:\/\/([^/]+)/i);
  if (m) return m[1].toLowerCase();
  try { return new URL(referrer).host.toLowerCase(); } catch { return referrer.replace(/^https?:\/\//, "").split("/")[0].toLowerCase(); }
};

export const classifyReferrer = (referrer: string | null | undefined, searchEngine?: string | null): { channel: Channel; label: string } => {
  const host = referrerHost(referrer);
  if (!host) return { channel: "Direct", label: "Direct or typed" };
  for (const s of SOURCES) if (s.test.test(host)) return { channel: s.channel, label: s.label };
  if (searchEngine) return { channel: "Search", label: searchEngine };
  return { channel: "Referral", label: host.replace(/^www\./, "") };
};

export interface SourceCount { label: string; visitors: number; hits: number }
export interface ChannelCount { channel: Channel; visitors: number; hits: number; sources: SourceCount[] }

interface SourceRow { referrer: string | null; search_engine: string | null; visitor_id: string | null; ip_hash: string | null }

/** People per channel and per named source; a visitor counts once per source. */
export const summariseSources = (rows: SourceRow[]): ChannelCount[] => {
  const byChannel = new Map<Channel, { visitors: Set<string>; hits: number; sources: Map<string, { visitors: Set<string>; hits: number }> }>();
  for (const r of rows) {
    const { channel, label } = classifyReferrer(r.referrer, r.search_engine);
    const id = r.visitor_id || r.ip_hash || "";
    const c = byChannel.get(channel) ?? { visitors: new Set<string>(), hits: 0, sources: new Map() };
    c.hits += 1; if (id) c.visitors.add(id);
    const s = c.sources.get(label) ?? { visitors: new Set<string>(), hits: 0 };
    s.hits += 1; if (id) s.visitors.add(id);
    c.sources.set(label, s); byChannel.set(channel, c);
  }
  const order: Channel[] = ["Search", "Social", "Referral", "Direct"];
  return Array.from(byChannel, ([channel, c]) => ({
    channel,
    visitors: c.visitors.size,
    hits: c.hits,
    sources: Array.from(c.sources, ([label, s]) => ({ label, visitors: s.visitors.size, hits: s.hits })).sort((a, b) => b.visitors - a.visitors || b.hits - a.hits),
  })).sort((a, b) => b.visitors - a.visitors || order.indexOf(a.channel) - order.indexOf(b.channel));
};

const ROW_CAP = 5000;

/** Human views in the window, grouped into channels. */
export const fetchSources = async (filters: AnalyticsRangeFilter) => {
  let q = supabase
    .from("unified_analytics_logs")
    .select("referrer, search_engine, visitor_id, ip_hash")
    .eq("is_bot", false)
    .gte("created_at", filters.since)
    .lte("created_at", filters.until);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.country) q = q.eq("country", filters.country);
  const { data, error } = await q.limit(ROW_CAP);
  const rows = (data ?? []) as SourceRow[];
  return { channels: summariseSources(rows), error, truncated: rows.length >= ROW_CAP };
};
