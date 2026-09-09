/**
 * AdminInsights — "/admin/insights"
 * ──────────────────────────────────────────────────────────────────────────
 * Unified Human + AI analytics command center. Replaces the old AI-only
 * dashboard. The route `/admin/ai-insights` still maps here so any
 * existing bookmarks keep working.
 *
 * Sections:
 *   A. Hero metrics  — Human Reach, AI Mindshare, Conversion Index
 *   B. Human report  — Top countries, device/browser breakdown, journeys
 *   C. AI report     — Bot leaderboard + content audit + llms.txt link
 *
 * Filters (top bar): date range, traffic type, category, country.
 * All panels read from the same filter state so the numbers always agree.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  DEPRECATION NOTICE — please read before re-adding anything!
 * ──────────────────────────────────────────────────────────────────────────
 * The old "Live Feed" panel was intentionally REMOVED. It listed the most
 * recent 25 raw analytics rows on every dashboard render, which:
 *   • added visual clutter that distracted from the actual KPIs above,
 *   • required a `select *` against `unified_analytics_logs` on every
 *     refresh, which got expensive as the table grew.
 *
 * Do NOT re-introduce a Live Feed without a strong product reason. If you
 * need to inspect raw rows, use the Supabase SQL editor directly. The
 * helper that powered it (`fetchRecentAnalyticsRows`) was deleted from
 * `src/services/unifiedAnalytics.ts` for the same reason.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isDeviceExcluded, setDeviceExcluded } from "@/services/analyticsGuards";
import {
  ArrowLeft, Activity, Bot, Sparkles, RefreshCw, ExternalLink, Users,
  Smartphone, Monitor, Tablet, Globe, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllBlogPosts } from "@/services/blogPosts";
import { fetchAllCmsPages } from "@/services/cmsPages";
import { fetchAllPages } from "@/services/pagination";
import {
  countAnalyticsRows,
  countUniqueHumanVisitors,
  fetchBotLeaderboard,
  fetchDeviceBrowserBreakdown,
  fetchTopCountries,
  fetchConvertedJourneys,
  countLeadsInWindow,
  fetchPageStats,
  fetchReferrerStats,
  fetchVisitorDepth,
  fetchPageTransitions,
  fetchPageBreakdown,
  fetchPageTrend,
  type AnalyticsRangeFilter,
  type TrafficTypeFilter,
  type JourneyRecord,
  type PageStatRow,
  type ReferrerStatRow,
  type VisitorDepthRow,
  type TransitionRow,
  type LabelCountRow,
  type PageTrendRow,
} from "@/services/unifiedAnalytics";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import useNoIndex from "@/hooks/useNoIndex";

type DateRangeKey = "today" | "7d" | "30d" | "90d";

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string; hours: number }[] = [
  { key: "today", label: "Today", hours: 24 },
  { key: "7d",    label: "7d",    hours: 24 * 7 },
  { key: "30d",   label: "30d",   hours: 24 * 30 },
  { key: "90d",   label: "90d",   hours: 24 * 90 },
];

interface AuditRow {
  id: string;
  title: string;
  slug: string;
  kind: "blog" | "page";
  status: string;
  ai_summary: string | null;
  optimized: boolean;
}

/** Heuristic for "good enough" AI summary: 60–320 chars (snippet sweet spot). */
function isAiSummaryOptimized(summary: string | null | undefined): boolean {
  if (!summary) return false;
  const trimmed = summary.trim();
  return trimmed.length >= 60 && trimmed.length <= 320;
}

const AdminInsights = ({ embedded = false }: { embedded?: boolean } = {}) => {
  useNoIndex();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filter state
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("7d");
  const [trafficType, setTrafficType] = useState<TrafficTypeFilter>("all");
  const [excluded, setExcluded] = useState<boolean>(() => isDeviceExcluded());
  const [categoryFilter, setCategoryFilter] = useState<"all" | "blog" | "page">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");

  // Data state
  const [loading, setLoading] = useState(true);
  // True when any panel's client-side aggregation hit its row cap (see
  // unifiedAnalytics.ts's ROW_CAP note) — the numbers below are computed
  // over a truncated sample of the selected window, not the full thing.
  const [resultsTruncated, setResultsTruncated] = useState(false);
  const [humanReach, setHumanReach] = useState(0);
  const [aiMindshare, setAiMindshare] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [topCountries, setTopCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [devices, setDevices] = useState<Array<{ name: string; count: number }>>([]);
  const [browsers, setBrowsers] = useState<Array<{ name: string; count: number }>>([]);
  const [botLeaderboard, setBotLeaderboard] = useState<Array<{ entity_name: string; count: number }>>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
  // Server-side aggregated panels (exact, no ROW_CAP sampling).
  const [pageStats, setPageStats] = useState<PageStatRow[]>([]);
  const [referrers, setReferrers] = useState<ReferrerStatRow[]>([]);
  const [visitorDepth, setVisitorDepth] = useState<VisitorDepthRow>({
    total_visitors: 0, multi_page_visitors: 0, avg_pages_per_visitor: 0,
  });
  const [transitions, setTransitions] = useState<TransitionRow[]>([]);
  // Single-page drill-down
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailReferrers, setDetailReferrers] = useState<LabelCountRow[]>([]);
  const [detailDevices, setDetailDevices] = useState<LabelCountRow[]>([]);
  const [detailCountries, setDetailCountries] = useState<LabelCountRow[]>([]);
  const [detailTrend, setDetailTrend] = useState<PageTrendRow[]>([]);
  // NOTE: `recentRows` (the Live Feed data) was removed — see file header
  // for why. Don't add it back without product approval.

  // Compute the active filter window
  const filters: AnalyticsRangeFilter = useMemo(() => {
    const opt = DATE_RANGE_OPTIONS.find((o) => o.key === dateRangeKey)!;
    const until = new Date().toISOString();
    const since = new Date(Date.now() - opt.hours * 60 * 60 * 1000).toISOString();
    return {
      since,
      until,
      trafficType,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      country: countryFilter === "all" ? undefined : countryFilter,
    };
  }, [dateRangeKey, trafficType, categoryFilter, countryFilter]);

  // ── Auth gate (this is a standalone route) ───────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin"); return; }
      const { data } = await supabase.from("admin_users").select("id").eq("user_id", session.user.id).maybeSingle();
      setIsAdmin(!!data);
      setAuthChecked(true);
    };
    check();
  }, [navigate]);

  /**
   * Pull every panel's data in parallel, scoped to the active filter set.
   * Wrapped in try/catch so a single panel's failure doesn't blank the
   * whole dashboard.
   */
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        uniqueHumans, botCountResult, leadsResult,
        countriesResult, deviceResult, leaderboardResult,
        journeysResult, blogResult, pageResult,
        pageStatsResult, referrerResult, depthResult, transitionsResult,
      ] = await Promise.all([
        countUniqueHumanVisitors(filters),
        countAnalyticsRows({ ...filters, trafficType: "bot" }),
        countLeadsInWindow(filters),
        fetchTopCountries(filters, 5),
        fetchDeviceBrowserBreakdown(filters),
        fetchBotLeaderboard(filters),
        fetchConvertedJourneys(filters, 15),
        // `fetchRecentAnalyticsRows` intentionally NOT called — Live Feed
        // panel was deprecated to reduce DB reads. See file header.
        // The content audit below needs every row, so page through each
        // table's `.range()`-based fetcher instead of one unbounded query.
        fetchAllPages(fetchAllBlogPosts),
        fetchAllPages(fetchAllCmsPages),
        fetchPageStats(filters),
        fetchReferrerStats(filters),
        fetchVisitorDepth(filters),
        fetchPageTransitions(filters, 10),
      ]);

      setPageStats(pageStatsResult.data);
      setReferrers(referrerResult.data);
      setVisitorDepth(depthResult.data);
      setTransitions(transitionsResult.data);

      setHumanReach(uniqueHumans.count ?? 0);
      setAiMindshare(botCountResult.count ?? 0);
      setLeadsCount(leadsResult.count ?? 0);
      setTopCountries(countriesResult.data || []);
      setDevices(deviceResult.devices || []);
      setBrowsers(deviceResult.browsers || []);
      setBotLeaderboard(leaderboardResult.data || []);
      setJourneys(journeysResult.data || []);
      setResultsTruncated(
        !!(uniqueHumans.truncated || countriesResult.truncated || deviceResult.truncated
          || leaderboardResult.truncated || journeysResult.truncated),
      );

      const blogRows: AuditRow[] = ((blogResult.data as Array<Record<string, unknown>>) || []).map((post) => ({
        id: post.id as string,
        title: post.title as string,
        slug: post.slug as string,
        kind: "blog",
        status: post.status as string,
        ai_summary: (post.ai_summary as string) ?? null,
        optimized: isAiSummaryOptimized(post.ai_summary as string),
      }));
      const pageRows: AuditRow[] = ((pageResult.data as Array<Record<string, unknown>>) || []).map((page) => ({
        id: page.id as string,
        title: page.title as string,
        slug: page.slug as string,
        kind: "page",
        status: page.status as string,
        ai_summary: (page.ai_summary as string) ?? null,
        optimized: isAiSummaryOptimized(page.ai_summary as string),
      }));
      setAuditRows([...pageRows, ...blogRows]);
    } catch (err) {
      console.error("Insights refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { if (isAdmin) refreshAll(); }, [isAdmin, refreshAll]);

  /**
   * Drill-down loader — runs whenever an admin clicks a row in the
   * "Pages" table (or changes the global filters while one is open).
   */
  useEffect(() => {
    if (!isAdmin || !selectedPath) return;
    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      const [ref, dev, ctry, trend] = await Promise.all([
        fetchPageBreakdown(selectedPath, filters, "referrer"),
        fetchPageBreakdown(selectedPath, filters, "device"),
        fetchPageBreakdown(selectedPath, filters, "country"),
        fetchPageTrend(selectedPath, filters),
      ]);
      if (cancelled) return;
      setDetailReferrers(ref.data);
      setDetailDevices(dev.data);
      setDetailCountries(ctry.data);
      setDetailTrend(trend.data);
      setDetailLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [isAdmin, selectedPath, filters]);

  if (!authChecked) {
    return (
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Access denied.</p>
      </div>
    );
  }

  // Derived
  const totalAudit = auditRows.length;
  const optimizedCount = auditRows.filter((r) => r.optimized).length;
  const visibilityScore = totalAudit > 0 ? Math.round((optimizedCount / totalAudit) * 100) : 0;
  const conversionIndex = humanReach > 0 ? ((leadsCount / humanReach) * 100).toFixed(1) : "0.0";
  const totalDeviceCount = devices.reduce((s, d) => s + d.count, 0) || 1;
  const totalBrowserCount = browsers.reduce((s, b) => s + b.count, 0) || 1;
  const allCountries = Array.from(new Set([...topCountries.map((c) => c.country), countryFilter !== "all" ? countryFilter : ""].filter(Boolean)));

  const deviceIcon = (name: string) => {
    if (name === "Mobile") return <Smartphone size={13} />;
    if (name === "Tablet") return <Tablet size={13} />;
    if (name === "Desktop") return <Monitor size={13} />;
    return <Globe size={13} />;
  };

  return (
    <div className={embedded ? "" : "admin-light min-h-screen"} style={embedded ? undefined : { backgroundColor: "hsl(var(--background))" }}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6"}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {embedded ? <span /> : (
            <Link to="/admin" className="flex items-center gap-1.5 font-body text-xs text-foreground uppercase tracking-wider">
              <ArrowLeft size={14} /> Back to Admin
            </Link>
          )}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-body text-xs cursor-pointer" style={{ color: "hsl(var(--muted-foreground))" }} title="Your own visits from this browser are not counted. Logged-in admins are never counted anyway; this covers the same browser when logged out.">
              <input type="checkbox" checked={excluded} onChange={(e) => { setDeviceExcluded(e.target.checked); setExcluded(e.target.checked); }} />
              Exclude this device
            </label>
            <button onClick={refreshAll} disabled={loading} className="admin-btn">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            Unified Insights
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Human visitors, AI crawlers, and the journey from one to a lead.
          </p>
        </div>

        {/* ── Filter bar ── */}
        <div className="rounded-md border bg-card p-3 flex flex-wrap items-center gap-2" style={{ borderColor: "hsl(var(--border))" }}>
          {/* Date range */}
          <div className="flex items-center gap-1" role="group" aria-label="Date range">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => setDateRangeKey(opt.key)} aria-pressed={dateRangeKey === opt.key}
                className={`admin-btn ${dateRangeKey === opt.key ? "" : "ghost"}`}
                style={dateRangeKey === opt.key ? { borderColor: "hsl(var(--foreground))" } : undefined}>{opt.label}</button>
            ))}
          </div>
          {/* Traffic type */}
          <div className="flex items-center gap-1" role="group" aria-label="Traffic type">
            {(["all", "human", "bot"] as TrafficTypeFilter[]).map((t) => (
              <button key={t} onClick={() => setTrafficType(t)} aria-pressed={trafficType === t}
                className={`admin-btn ${trafficType === t ? "" : "ghost"}`}
                style={trafficType === t ? { borderColor: "hsl(var(--foreground))" } : undefined}>{t === "all" ? "Combined" : t === "human" ? "Humans" : "Bots"}</button>
            ))}
          </div>
          {/* Category */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="px-3 py-1.5 rounded-md border font-body text-xs"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
            <option value="all">All content</option>
            <option value="blog">Blogs only</option>
            <option value="page">Pages only</option>
          </select>
          {/* Country */}
          {allCountries.length > 0 && (
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border font-body text-xs"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
              <option value="all">All countries</option>
              {allCountries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {resultsTruncated && (
          <div
            className="rounded-lg border px-4 py-2.5 font-body text-xs"
            style={{ borderColor: "hsl(var(--admin-warn) / 0.4)", backgroundColor: "hsl(var(--admin-warn) / 0.1)", color: "hsl(var(--admin-warn))" }}
          >
            Results may be incomplete for this range — one or more panels hit their row cap and are
            computed over a partial sample. Narrow the date range or filters for an exact count.
          </div>
        )}

        {/* ── Section A: Hero metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Users size={16} />} label="Human Reach" value={humanReach.toString()}
            hint="People who stayed at least a second" accentHsl="var(--foreground)" />
          <StatCard icon={<Bot size={16} />} label="AI Mindshare" value={aiMindshare.toString()}
            hint="Crawler hits in window" accentHsl="var(--admin-accent)" />
          <StatCard icon={<Sparkles size={16} />} label="Conversion Index" value={`${conversionIndex}%`}
            hint={`${leadsCount} leads from ${humanReach} visitors`} accentHsl="var(--admin-ok)" />
        </div>

        {/* ── Section B: Human Behavioural Report ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Top Countries" loading={loading}>
            {topCountries.length === 0 ? (
              <Empty>No country data yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {topCountries.map((c) => {
                  const pct = humanReach > 0 ? Math.round((c.count / Math.max(humanReach, c.count)) * 100) : 0;
                  return (
                    <li key={c.country} className="space-y-1">
                      <div className="flex justify-between font-body text-xs"><span>{c.country}</span><span style={{ color: "hsl(var(--muted-foreground))" }}>{c.count}</span></div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--muted))" }}>
                        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: "hsl(var(--foreground))" }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Devices" loading={loading}>
            {devices.length === 0 ? <Empty>No device data yet.</Empty> : (
              <ul className="space-y-2">
                {devices.slice(0, 5).map((d) => (
                  <li key={d.name} className="flex items-center justify-between font-body text-xs">
                    <span className="flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>{deviceIcon(d.name)} {d.name}</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>{Math.round((d.count / totalDeviceCount) * 100)}% · {d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Browsers" loading={loading}>
            {browsers.length === 0 ? <Empty>No browser data yet.</Empty> : (
              <ul className="space-y-2">
                {browsers.slice(0, 5).map((b) => (
                  <li key={b.name} className="flex items-center justify-between font-body text-xs">
                    <span style={{ color: "hsl(var(--foreground))" }}>{b.name}</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>{Math.round((b.count / totalBrowserCount) * 100)}% · {b.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── Per-page performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Panel title="Pages" loading={loading}>
              {pageStats.length === 0 ? <Empty>No page views in this window yet.</Empty> : (
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full font-body text-xs">
                    <thead>
                      <tr style={{ color: "hsl(var(--muted-foreground))" }}>
                        <th className="text-left font-medium pb-2">Page</th>
                        <th className="text-right font-medium pb-2">Views</th>
                        <th className="text-right font-medium pb-2">Unique</th>
                        <th className="text-right font-medium pb-2">Avg&nbsp;time</th>
                        <th className="text-right font-medium pb-2">Scroll</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageStats.map((row) => (
                        <tr
                          key={row.path}
                          onClick={() => setSelectedPath(row.path === selectedPath ? null : row.path)}
                          className="cursor-pointer"
                          style={{
                            backgroundColor: selectedPath === row.path ? "hsl(var(--muted))" : "transparent",
                          }}
                        >
                          <td className="py-1.5 pr-2 truncate max-w-[240px]" style={{ color: "hsl(var(--foreground))" }}>{row.path}</td>
                          <td className="py-1.5 text-right" style={{ color: "hsl(var(--foreground))" }}>{row.views}</td>
                          <td className="py-1.5 text-right" style={{ color: "hsl(var(--muted-foreground))" }}>{row.unique_visitors}</td>
                          <td className="py-1.5 text-right" style={{ color: "hsl(var(--muted-foreground))" }}>{row.avg_duration ? `${row.avg_duration}s` : "—"}</td>
                          <td className="py-1.5 text-right" style={{ color: "hsl(var(--muted-foreground))" }}>{row.avg_scroll ? `${row.avg_scroll}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Traffic Sources" loading={loading}>
              {referrers.length === 0 ? <Empty>No referrer data yet.</Empty> : (
                <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                  {referrers.slice(0, 10).map((r) => (
                    <li key={`${r.kind}-${r.label}`} className="flex items-center justify-between gap-2 font-body text-xs">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Tag color={r.kind === "search" ? "gold" : r.kind === "campaign" ? "purple" : r.kind === "direct" ? "amber" : "green"}>{r.kind}</Tag>
                        <span className="truncate" style={{ color: "hsl(var(--foreground))" }}>{r.label}</span>
                      </span>
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>{r.visits} · {r.unique_visitors}u</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Reading Depth" loading={loading}>
              <ul className="space-y-2 font-body text-xs">
                <li className="flex justify-between"><span style={{ color: "hsl(var(--muted-foreground))" }}>Unique visitors</span><span style={{ color: "hsl(var(--foreground))" }}>{visitorDepth.total_visitors}</span></li>
                <li className="flex justify-between"><span style={{ color: "hsl(var(--muted-foreground))" }}>Read 2+ pages</span><span style={{ color: "hsl(var(--foreground))" }}>{visitorDepth.multi_page_visitors}</span></li>
                <li className="flex justify-between"><span style={{ color: "hsl(var(--muted-foreground))" }}>Avg pages / visitor</span><span style={{ color: "hsl(var(--foreground))" }}>{visitorDepth.avg_pages_per_visitor}</span></li>
              </ul>
            </Panel>
          </div>
        </div>

        {/* Page drill-down */}
        {selectedPath && (
          <Panel title={`Page detail · ${selectedPath}`} loading={detailLoading}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <MiniList title="Came from" rows={detailReferrers} />
              <MiniList title="Devices" rows={detailDevices} />
              <MiniList title="Countries" rows={detailCountries} />
              <div>
                <h4 className="font-body text-[10px] uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Daily views</h4>
                {detailTrend.length === 0 ? <Empty>No data.</Empty> : (
                  <ul className="space-y-1 max-h-[160px] overflow-y-auto">
                    {detailTrend.map((d) => (
                      <li key={d.day} className="flex justify-between font-body text-xs">
                        <span style={{ color: "hsl(var(--muted-foreground))" }}>{d.day}</span>
                        <span style={{ color: "hsl(var(--foreground))" }}>{d.views} · {d.unique_visitors}u</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => setSelectedPath(null)} className="mt-3 font-body text-[11px] uppercase tracking-wider" style={{ color: "hsl(var(--foreground))" }}>
              Close detail
            </button>
          </Panel>
        )}

        {/* Where visitors go next */}
        <Panel title="Where Visitors Go Next" loading={loading}>
          {transitions.length === 0 ? <Empty>Not enough multi-page sessions yet.</Empty> : (
            <ul className="space-y-1.5">
              {transitions.map((t) => (
                <li key={`${t.from_path}->${t.to_path}`} className="flex items-center gap-2 font-body text-xs">
                  <span className="px-1.5 py-0.5 rounded truncate max-w-[38%]" style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>{t.from_path}</span>
                  <ChevronRight size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
                  <span className="px-1.5 py-0.5 rounded truncate max-w-[38%]" style={{ backgroundColor: "hsl(var(--admin-accent) / 0.18)", color: "hsl(var(--foreground))" }}>{t.to_path}</span>
                  <span className="ml-auto" style={{ color: "hsl(var(--muted-foreground))" }}>{t.transitions}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Path to Lead */}
        <Panel title="Path to Lead" loading={loading}>
          {journeys.length === 0 ? (
            <Empty>No converted visitors yet — once someone fills a lead form, their visit history appears here.</Empty>
          ) : (
            <ul className="space-y-2">
              {journeys.map((j, idx) => (
                <li key={idx} className="p-2.5 rounded-lg border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-body text-xs font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{j.stitched_email}</span>
                    <span className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(j.converted_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {j.path_sequence.slice(0, 6).map((p, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "hsl(var(--muted))" }}>{p}</span>
                        {i < Math.min(j.path_sequence.length, 6) - 1 && <ChevronRight size={10} />}
                      </span>
                    ))}
                    {j.path_sequence.length > 6 && <span>+{j.path_sequence.length - 6} more</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── Section C: AI Crawler & AEO Report ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Bot Leaderboard" loading={loading}>
            {botLeaderboard.length === 0 ? <Empty>No AI crawlers yet.</Empty> : (
              <ul className="space-y-2">
                {botLeaderboard.slice(0, 8).map((b) => (
                  <li key={b.entity_name} className="flex items-center justify-between font-body text-xs">
                    <span className="truncate" style={{ color: "hsl(var(--foreground))" }}>{b.entity_name.split(" (")[0]}</span>
                    <span style={{ color: "hsl(var(--foreground))" }}>{b.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="lg:col-span-2">
            <Panel title={`Content Audit · ${visibilityScore}% optimised`} loading={loading}>
              {auditRows.length === 0 ? <Empty>No content yet.</Empty> : (
                <ul className="space-y-2 max-h-[360px] overflow-y-auto">
                  {auditRows.map((row) => (
                    <li key={`${row.kind}-${row.id}`} className="flex items-start justify-between gap-3 p-3 rounded-lg border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tag color={row.kind === "blog" ? "purple" : "gold"}>{row.kind}</Tag>
                          <Tag color={row.status === "published" ? "green" : "amber"}>{row.status}</Tag>
                          <Tag color={row.optimized ? "green" : "red"}>{row.optimized ? "Optimised" : "Needs summary"}</Tag>
                        </div>
                        <div className="font-body text-sm font-medium mt-1.5 truncate" style={{ color: "hsl(var(--foreground))" }}>{row.title}</div>
                        <div className="font-body text-xs mt-0.5 line-clamp-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {row.ai_summary ? `"${row.ai_summary.slice(0, 200)}${row.ai_summary.length > 200 ? "…" : ""}"` : "No AI summary set."}
                        </div>
                      </div>
                      <a href={row.kind === "blog" ? `/blog/${row.slug}` : `/p/${row.slug}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }} title="Open page">
                        <ExternalLink size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {/* llms.txt link card */}
        <div className="rounded-md border bg-card p-4" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>llms.txt manifest</h3>
              <p className="font-body text-xs text-foreground mt-0.5">The AI-readable index your bots crawl. Auto-updated on every blog publish.</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/llms-txt`} target="_blank" rel="noopener noreferrer"
                className="admin-btn">
                View llms.txt <ExternalLink size={11} className="inline ml-1" />
              </a>
              <a href={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/llms-txt?full=1`} target="_blank" rel="noopener noreferrer"
                className="font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full text-muted bg-primary">
                View llms-full.txt <ExternalLink size={11} className="inline ml-1" />
              </a>
            </div>
          </div>
        </div>

        {/*
          Live Feed panel removed — see file header. Don't reintroduce it
          without product approval; it was a per-render `select *` against
          `unified_analytics_logs` that scaled poorly and added clutter.
        */}
      </div>
    </div>
  );
};

// ── Tiny sub-components, kept inline because they're page-specific ─────
const StatCard = ({ icon, label, value, hint, accentHsl }: { icon: React.ReactNode; label: string; value: string; hint: string; accentHsl: string }) => (
  <div className="rounded-md border p-4 sm:p-5 bg-card" style={{ borderColor: "hsl(var(--border))" }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ backgroundColor: `hsl(${accentHsl} / 0.1)`, color: `hsl(${accentHsl})` }}>{icon}</span>
      <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
    </div>
    <div className="font-display text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "hsl(var(--foreground))" }}>{value}</div>
    <div className="font-body text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{hint}</div>
  </div>
);

const Panel = ({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) => (
  <div className="rounded-md border bg-card p-4 sm:p-5" style={{ borderColor: "hsl(var(--border))" }}>
    <h2 className="font-display text-base font-bold mb-3" style={{ color: "hsl(var(--foreground))" }}>{title}</h2>
    {loading ? <ListSkeleton rows={4} rowHeight="h-8" /> : children}
  </div>
);

/** Compact label/count list used by the single-page drill-down. */
const MiniList = ({ title, rows }: { title: string; rows: Array<{ label: string; visits: number }> }) => (
  <div>
    <h4 className="font-body text-[10px] uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>{title}</h4>
    {rows.length === 0 ? <Empty>No data.</Empty> : (
      <ul className="space-y-1 max-h-[160px] overflow-y-auto">
        {rows.slice(0, 8).map((r) => (
          <li key={r.label} className="flex justify-between gap-2 font-body text-xs">
            <span className="truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{r.label}</span>
            <span style={{ color: "hsl(var(--foreground))" }}>{r.visits}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="font-body text-xs py-4 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>{children}</p>
);

const Tag = ({ color, children }: { color: "purple" | "gold" | "green" | "red" | "amber"; children: React.ReactNode }) => {
  const palette: Record<string, { bg: string; fg: string }> = {
    purple: { bg: "hsl(var(--muted))", fg: "hsl(var(--foreground))" },
    gold:   { bg: "hsl(var(--admin-accent) / 0.18)",  fg: "hsl(var(--foreground))" },
    green:  { bg: "hsl(var(--admin-ok) / 0.15)",   fg: "hsl(var(--admin-ok))" },
    red:    { bg: "hsl(var(--admin-bad) / 0.15)",  fg: "hsl(var(--admin-bad))" },
    amber:  { bg: "hsl(var(--admin-warn) / 0.15)", fg: "hsl(var(--admin-warn))" },
  };
  const p = palette[color];
  return <span className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: p.bg, color: p.fg }}>{children}</span>;
};

export default AdminInsights;
