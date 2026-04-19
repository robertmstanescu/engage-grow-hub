/**
 * Unified analytics — admin-side reads for /admin/insights.
 *
 * This file replaces the old `aiCrawlerLogs.ts`. The new
 * `unified_analytics_logs` table holds BOTH human and bot rows, so all
 * dashboard queries flow through a single set of helpers and a single
 * date-range / traffic-type filter.
 *
 * Writes happen exclusively via the `track-visitor`, `llms-txt`, and
 * `submit-lead` Edge Functions (which use the service role). Admins
 * only ever SELECT.
 */

import { supabase } from "@/integrations/supabase/client";

export interface UnifiedAnalyticsRecord {
  id: string;
  is_bot: boolean;
  entity_name: string;
  path: string;
  category: string;
  referrer: string | null;
  search_engine: string | null;
  browser: string | null;
  device: string | null;
  country: string | null;
  duration_seconds: number | null;
  scroll_depth: number | null;
  visitor_id: string | null;
  stitched_email: string | null;
  user_agent: string;
  ip_hash: string | null;
  source: string;
  created_at: string;
}

export type TrafficTypeFilter = "all" | "human" | "bot";

export interface AnalyticsRangeFilter {
  /** Inclusive lower bound (ISO timestamp). */
  since: string;
  /** Inclusive upper bound (ISO timestamp). Defaults to "now" at the call site. */
  until: string;
  /** Restrict to humans, bots, or both. */
  trafficType: TrafficTypeFilter;
  /** Restrict to a content category, or undefined for all. */
  category?: "blog" | "page" | "manifest" | "other";
  /** Restrict to a single 2-letter country code, or undefined for all. */
  country?: string;
}

/**
 * Build a query with all of the dashboard's global filters applied.
 * Centralised so every panel computes its number against the SAME slice
 * of data — otherwise the cards and the table can disagree visually.
 *
 * The builder is typed `any` because the Supabase generated types model
 * each chained `.eq` / `.gte` step as a deep generic that hits the TS
 * recursion limit. We trade a tiny amount of type safety for callers
 * that compile in <1s; the surface here is small (5 chainable ops) and
 * fully tested by the dashboard panels above.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyAnalyticsFilters(query: any, filters: AnalyticsRangeFilter): any {
  let q = query.gte("created_at", filters.since).lte("created_at", filters.until);
  if (filters.trafficType === "human") q = q.eq("is_bot", false);
  if (filters.trafficType === "bot") q = q.eq("is_bot", true);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.country) q = q.eq("country", filters.country);
  return q;
}

// Note: `fetchRecentAnalyticsRows` was removed when the "Live Feed" panel
// was deprecated from the Insights dashboard. If you need to inspect the
// raw rows for debugging, query `unified_analytics_logs` directly via the
// Supabase SQL editor — keeping that data off the dashboard avoids a
// constant DB read every time an admin opens /admin/insights.

/**
 * Count rows in the filter window. We use `head: true, count: 'exact'`
 * so Postgres only returns the count — no row payload over the wire.
 */
export const countAnalyticsRows = async (filters: AnalyticsRangeFilter) => {
  const base = supabase.from("unified_analytics_logs").select("id", { count: "exact", head: true });
  return applyAnalyticsFilters(base as never, filters);
};

/**
 * Count distinct human visitors in the window. We approximate "unique"
 * by counting distinct `visitor_id`s when present, falling back to
 * distinct `ip_hash` for anonymous-while-not-consented rows.
 *
 * @returns approximate unique-visitor count
 */
export const countUniqueHumanVisitors = async (filters: AnalyticsRangeFilter) => {
  const humanFilters: AnalyticsRangeFilter = { ...filters, trafficType: "human" };
  const base = supabase
    .from("unified_analytics_logs")
    .select("visitor_id, ip_hash");
  const { data, error } = await applyAnalyticsFilters(base as never, humanFilters)
    .limit(5000);
  if (error || !data) return { count: 0, error };
  const seen = new Set<string>();
  for (const row of data as Array<{ visitor_id: string | null; ip_hash: string | null }>) {
    seen.add(row.visitor_id || row.ip_hash || "");
  }
  seen.delete("");
  return { count: seen.size, error: null };
};

/**
 * Group bot hits by entity_name (which doubles as the bot family) and
 * return the leaderboard. Used by both the "AI Mindshare" stat card and
 * the "Bot Leaderboard" panel.
 */
export const fetchBotLeaderboard = async (filters: AnalyticsRangeFilter) => {
  const botFilters: AnalyticsRangeFilter = { ...filters, trafficType: "bot" };
  const base = supabase.from("unified_analytics_logs").select("entity_name");
  const { data, error } = await applyAnalyticsFilters(base as never, botFilters).limit(5000);
  if (error || !data) return { data: [] as Array<{ entity_name: string; count: number }>, error };
  const counts = new Map<string, number>();
  for (const row of data as Array<{ entity_name: string }>) {
    counts.set(row.entity_name, (counts.get(row.entity_name) ?? 0) + 1);
  }
  return {
    data: Array.from(counts, ([entity_name, count]) => ({ entity_name, count })).sort(
      (a, b) => b.count - a.count,
    ),
    error: null,
  };
};

/**
 * Aggregate device + browser counts (humans only). Powers the donut chart.
 */
export const fetchDeviceBrowserBreakdown = async (filters: AnalyticsRangeFilter) => {
  const humanFilters: AnalyticsRangeFilter = { ...filters, trafficType: "human" };
  const base = supabase.from("unified_analytics_logs").select("device, browser");
  const { data, error } = await applyAnalyticsFilters(base as never, humanFilters).limit(5000);
  if (error || !data) {
    return {
      devices: [] as Array<{ name: string; count: number }>,
      browsers: [] as Array<{ name: string; count: number }>,
      error,
    };
  }
  const deviceMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  for (const row of data as Array<{ device: string | null; browser: string | null }>) {
    const d = row.device || "Unknown";
    const b = row.browser || "Unknown";
    deviceMap.set(d, (deviceMap.get(d) ?? 0) + 1);
    browserMap.set(b, (browserMap.get(b) ?? 0) + 1);
  }
  const toArr = (m: Map<string, number>) =>
    Array.from(m, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return { devices: toArr(deviceMap), browsers: toArr(browserMap), error: null };
};

/**
 * Top countries by human visit count. Used by the geographic strip.
 */
export const fetchTopCountries = async (filters: AnalyticsRangeFilter, topN = 5) => {
  const humanFilters: AnalyticsRangeFilter = { ...filters, trafficType: "human" };
  const base = supabase.from("unified_analytics_logs").select("country");
  const { data, error } = await applyAnalyticsFilters(base as never, humanFilters).limit(5000);
  if (error || !data) return { data: [] as Array<{ country: string; count: number }>, error };
  const counts = new Map<string, number>();
  for (const row of data as Array<{ country: string | null }>) {
    if (!row.country) continue;
    counts.set(row.country, (counts.get(row.country) ?? 0) + 1);
  }
  return {
    data: Array.from(counts, ([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN),
    error: null,
  };
};

/**
 * Pull every visitor whose journey ended with a stitched email — i.e.
 * the people who actually converted. Returns one row per visitor with
 * an array of paths in the order they viewed them.
 */
export const fetchConvertedJourneys = async (filters: AnalyticsRangeFilter, limit = 20) => {
  const base = supabase
    .from("unified_analytics_logs")
    .select("visitor_id, stitched_email, path, created_at")
    .not("stitched_email", "is", null);
  const { data, error } = await applyAnalyticsFilters(base as never, filters)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error || !data) return { data: [] as JourneyRecord[], error };

  const grouped = new Map<string, JourneyRecord>();
  for (const row of data as Array<{
    visitor_id: string | null;
    stitched_email: string | null;
    path: string;
    created_at: string;
  }>) {
    const key = row.visitor_id || row.stitched_email || "";
    if (!key) continue;
    if (!grouped.has(key)) {
      grouped.set(key, {
        visitor_id: row.visitor_id,
        stitched_email: row.stitched_email,
        path_sequence: [],
        first_seen: row.created_at,
        converted_at: row.created_at,
      });
    }
    const entry = grouped.get(key)!;
    entry.path_sequence.push(row.path);
    entry.converted_at = row.created_at;
  }
  return {
    data: Array.from(grouped.values())
      .sort((a, b) => b.converted_at.localeCompare(a.converted_at))
      .slice(0, limit),
    error: null,
  };
};

export interface JourneyRecord {
  visitor_id: string | null;
  stitched_email: string | null;
  path_sequence: string[];
  first_seen: string;
  converted_at: string;
}

/**
 * Count rows in the leads table for the same window — needed to compute
 * the "Conversion Index" stat (leads / unique humans).
 */
export const countLeadsInWindow = async (filters: AnalyticsRangeFilter) => {
  return supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", filters.since)
    .lte("created_at", filters.until);
};
