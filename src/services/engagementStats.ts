import { supabase } from "@/integrations/supabase/client";
import type { AnalyticsRangeFilter } from "./unifiedAnalytics";

/**
 * engagementStats — what the engagement beacons add up to.
 *
 * Time on page is the MEDIAN of foreground seconds over engaged views,
 * not the mean, so one forgotten tab cannot drag the number. Read depth
 * is the share of engaged views that reached 25 / 50 / 75 / 100 % of the
 * page. Both are computed here from rows, per page and overall, because
 * the beacons are new and small enough to aggregate in the browser.
 */

export interface EngagementRow { path: string; duration_seconds: number | null; scroll_depth: number | null; engaged: boolean }

export interface DepthBuckets { reached25: number; reached50: number; reached75: number; reached100: number; views: number }

export interface EngagementSummary {
  engagedViews: number;
  medianSeconds: number;
  depth: DepthBuckets;
}

export interface PageEngagement extends EngagementSummary { path: string }

export const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

export const summarise = (rows: EngagementRow[]): EngagementSummary => {
  const engaged = rows.filter((r) => r.engaged);
  const seconds = engaged.map((r) => r.duration_seconds ?? 0);
  const depths = engaged.map((r) => r.scroll_depth ?? 0);
  const share = (min: number) => (depths.length ? Math.round((depths.filter((d) => d >= min).length / depths.length) * 100) : 0);
  return {
    engagedViews: engaged.length,
    medianSeconds: median(seconds),
    depth: { reached25: share(25), reached50: share(50), reached75: share(75), reached100: share(100), views: depths.length },
  };
};

export const summariseByPage = (rows: EngagementRow[]): PageEngagement[] => {
  const byPath = new Map<string, EngagementRow[]>();
  for (const r of rows) byPath.set(r.path, [...(byPath.get(r.path) ?? []), r]);
  return Array.from(byPath, ([path, list]) => ({ path, ...summarise(list) }))
    .filter((p) => p.engagedViews > 0)
    .sort((a, b) => b.engagedViews - a.engagedViews);
};

const ROW_CAP = 5000;

/** Engaged human views in the window, overall and per page. */
export const fetchEngagement = async (filters: AnalyticsRangeFilter) => {
  let q = supabase
    .from("unified_analytics_logs")
    .select("path, duration_seconds, scroll_depth, engaged")
    .eq("is_bot", false)
    .gte("created_at", filters.since)
    .lte("created_at", filters.until);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.country) q = q.eq("country", filters.country);
  const { data, error } = await q.limit(ROW_CAP);
  const rows = (data ?? []) as EngagementRow[];
  return { overall: summarise(rows), pages: summariseByPage(rows), error, truncated: rows.length >= ROW_CAP };
};

/** "Romania" for "RO"; the code itself when the browser cannot name it. */
export const countryName = (code: string): string => {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { return code; }
};

export const formatSeconds = (s: number): string => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
