/**
 * AI Crawler Logs service — read-only access for the admin dashboard.
 *
 * Writes happen exclusively via the `track-ai-crawler` and `llms-txt`
 * Edge Functions (using the service role) — admins should never insert
 * directly. This file exposes thin wrappers around the SELECT queries
 * needed by the AI Insights dashboard.
 */

import { supabase } from "@/integrations/supabase/client";

export interface AiCrawlerLogRecord {
  id: string;
  bot_name: string;
  user_agent: string;
  page_path: string;
  source: "server" | "client";
  ip_hash: string | null;
  created_at: string;
}

/**
 * Fetch the most recent crawler hits across all bots.
 * Used to power the live feed on the AI Insights dashboard.
 *
 * @param limit - How many rows to return (default 20, max 100)
 */
export const fetchRecentAiCrawlerLogs = (limit = 20) =>
  supabase
    .from("ai_crawler_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

/**
 * Count how many crawler hits happened in the last N hours.
 * Used for the "Crawler Activity (24h)" stat card.
 *
 * @param hours - Window size in hours (default 24)
 */
export const countAiCrawlerHitsSince = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  return supabase
    .from("ai_crawler_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
};

/**
 * Group hits by bot name for the "Most Interested AI" stat.
 * Returns rows already aggregated client-side — Postgres count() per
 * bot would need a custom RPC; this is small enough not to matter.
 *
 * @param hours - Window to aggregate over (default 168 = 7 days)
 */
export const fetchTopAiCrawlerBots = async (hours = 168) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("ai_crawler_logs")
    .select("bot_name")
    .gte("created_at", since)
    .limit(2000);

  if (error || !data) return { data: [] as { bot_name: string; count: number }[], error };

  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.bot_name, (counts.get(row.bot_name) ?? 0) + 1);
  }
  const aggregated = Array.from(counts, ([bot_name, count]) => ({ bot_name, count }))
    .sort((a, b) => b.count - a.count);

  return { data: aggregated, error: null };
};
