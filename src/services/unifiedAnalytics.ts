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
 * Every panel below fetches raw rows client-side and aggregates in JS,
 * capped at this limit — Postgres will happily return more, but pulling
 * an unbounded row set into the browser to GROUP BY in JS doesn't scale.
 * For a busy date range that hits the cap, the aggregation below is
 * computed over a truncated sample, not the full window — silently
 * under-reporting with no indication to the admin unless callers check
 * the `truncated` flag each function now returns. AdminInsights.tsx
 * surfaces that flag as a visible "results may be incomplete" warning
 * rather than letting a wrong number pass as a real one. The correct
 * long-term fix is server-side aggregation (a Postgres RPC/view with
 * GROUP BY, which scales past this cap trivially) — this flag is the
 * "at minimum" mitigation until that lands.
 */
const ROW_CAP = 5000;

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
    .limit(ROW_CAP);
  if (error || !data) return { count: 0, error, truncated: false };
  const seen = new Set<string>();
  for (const row of data as Array<{ visitor_id: string | null; ip_hash: string | null }>) {
    seen.add(row.visitor_id || row.ip_hash || "");
  }
  seen.delete("");
  return { count: seen.size, error: null, truncated: data.length >= ROW_CAP };
};

/**
 * Group bot hits by entity_name (which doubles as the bot family) and
 * return the leaderboard. Used by both the "AI Mindshare" stat card and
 * the "Bot Leaderboard" panel.
 */
export const fetchBotLeaderboard = async (filters: AnalyticsRangeFilter) => {
  const botFilters: AnalyticsRangeFilter = { ...filters, trafficType: "bot" };
  const base = supabase.from("unified_analytics_logs").select("entity_name");
  const { data, error } = await applyAnalyticsFilters(base as never, botFilters).limit(ROW_CAP);
  if (error || !data) return { data: [] as Array<{ entity_name: string; count: number }>, error, truncated: false };
  const counts = new Map<string, number>();
  for (const row of data as Array<{ entity_name: string }>) {
    counts.set(row.entity_name, (counts.get(row.entity_name) ?? 0) + 1);
  }
  return {
    data: Array.from(counts, ([entity_name, count]) => ({ entity_name, count })).sort(
      (a, b) => b.count - a.count,
    ),
    error: null,
    truncated: data.length >= ROW_CAP,
  };
};

/**
 * Aggregate device + browser counts (humans only). Powers the donut chart.
 */
export const fetchDeviceBrowserBreakdown = async (filters: AnalyticsRangeFilter) => {
  const humanFilters: AnalyticsRangeFilter = { ...filters, trafficType: "human" };
  const base = supabase.from("unified_analytics_logs").select("device, browser");
  const { data, error } = await applyAnalyticsFilters(base as never, humanFilters).limit(ROW_CAP);
  if (error || !data) {
    return {
      devices: [] as Array<{ name: string; count: number }>,
      browsers: [] as Array<{ name: string; count: number }>,
      error,
      truncated: false,
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
  return { devices: toArr(deviceMap), browsers: toArr(browserMap), error: null, truncated: data.length >= ROW_CAP };
};

/**
 * Top countries by human visit count. Used by the geographic strip.
 */
export const fetchTopCountries = async (filters: AnalyticsRangeFilter, topN = 5) => {
  const humanFilters: AnalyticsRangeFilter = { ...filters, trafficType: "human" };
  const base = supabase.from("unified_analytics_logs").select("country");
  const { data, error } = await applyAnalyticsFilters(base as never, humanFilters).limit(ROW_CAP);
  if (error || !data) return { data: [] as Array<{ country: string; count: number }>, error, truncated: false };
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
    truncated: data.length >= ROW_CAP,
  };
};

/**
 * Pull every visitor whose journey ended with a stitched email — i.e.
 * the people who actually converted. Returns one row per visitor with
 * an array of paths in the order they viewed them.
 */
const JOURNEY_ROW_CAP = 2000;

export const fetchConvertedJourneys = async (filters: AnalyticsRangeFilter, limit = 20) => {
  const base = supabase
    .from("unified_analytics_logs")
    .select("visitor_id, stitched_email, path, created_at")
    .not("stitched_email", "is", null);
  const { data, error } = await applyAnalyticsFilters(base as never, filters)
    .order("created_at", { ascending: true })
    .limit(JOURNEY_ROW_CAP);
  if (error || !data) return { data: [] as JourneyRecord[], error, truncated: false };

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
    truncated: data.length >= JOURNEY_ROW_CAP,
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

/* ══════════════════════════════════════════════════════════════════════
 * Server-side aggregation (Postgres RPCs)
 * ══════════════════════════════════════════════════════════════════════
 * The helpers above pull raw rows and GROUP BY in JS, capped at
 * ROW_CAP. The functions below push the aggregation into Postgres, so
 * they're exact regardless of window size. They're admin-gated inside
 * the SQL (`public.is_admin(auth.uid())`), so a non-admin simply gets
 * an empty set.
 */

export interface PageStatRow {
  path: string;
  views: number;
  unique_visitors: number;
  avg_duration: number | null;
  avg_scroll: number | null;
}

export interface ReferrerStatRow {
  label: string;
  kind: "search" | "campaign" | "direct" | "referral";
  visits: number;
  unique_visitors: number;
}

export interface VisitorDepthRow {
  total_visitors: number;
  multi_page_visitors: number;
  avg_pages_per_visitor: number;
}

export interface TransitionRow {
  from_path: string;
  to_path: string;
  transitions: number;
}

export interface LabelCountRow {
  label: string;
  visits: number;
}

export interface PageTrendRow {
  day: string;
  views: number;
  unique_visitors: number;
}

/** Per-page views / unique visitors / engagement for the filter window. */
export const fetchPageStats = async (filters: AnalyticsRangeFilter) => {
  const { data, error } = await supabase.rpc("analytics_page_stats", {
    p_since: filters.since,
    p_until: filters.until,
    p_traffic: filters.trafficType,
    p_country: filters.country ?? null,
    p_category: filters.category ?? null,
  });
  return { data: (data ?? []) as PageStatRow[], error };
};

/** Where the traffic came from (search engine, campaign, referral, direct). */
export const fetchReferrerStats = async (filters: AnalyticsRangeFilter) => {
  const { data, error } = await supabase.rpc("analytics_referrer_stats", {
    p_since: filters.since,
    p_until: filters.until,
    p_traffic: filters.trafficType,
  });
  return { data: (data ?? []) as ReferrerStatRow[], error };
};

/** How many visitors read more than one page, and the average depth. */
export const fetchVisitorDepth = async (filters: AnalyticsRangeFilter) => {
  const { data, error } = await supabase.rpc("analytics_visitor_depth", {
    p_since: filters.since,
    p_until: filters.until,
  });
  const row = (data as VisitorDepthRow[] | null)?.[0] ?? {
    total_visitors: 0,
    multi_page_visitors: 0,
    avg_pages_per_visitor: 0,
  };
  return { data: row, error };
};

/** Most common page-to-page hops (which page leads to which). */
export const fetchPageTransitions = async (filters: AnalyticsRangeFilter, limit = 12) => {
  const { data, error } = await supabase.rpc("analytics_page_transitions", {
    p_since: filters.since,
    p_until: filters.until,
    p_limit: limit,
  });
  return { data: (data ?? []) as TransitionRow[], error };
};

/** Drill-down for one page: referrers / devices / browsers / countries. */
export const fetchPageBreakdown = async (
  path: string,
  filters: AnalyticsRangeFilter,
  dimension: "referrer" | "device" | "browser" | "country" = "referrer",
) => {
  const { data, error } = await supabase.rpc("analytics_page_breakdown", {
    p_path: path,
    p_since: filters.since,
    p_until: filters.until,
    p_dimension: dimension,
  });
  return { data: (data ?? []) as LabelCountRow[], error };
};

/** Daily views / unique visitors for one page. */
export const fetchPageTrend = async (path: string, filters: AnalyticsRangeFilter) => {
  const { data, error } = await supabase.rpc("analytics_page_trend", {
    p_path: path,
    p_since: filters.since,
    p_until: filters.until,
  });
  return { data: (data ?? []) as PageTrendRow[], error };
};
