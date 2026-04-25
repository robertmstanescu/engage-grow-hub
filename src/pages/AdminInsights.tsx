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

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Activity, Bot, Sparkles, RefreshCw, ExternalLink, Users,
  Smartphone, Monitor, Tablet, Globe, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllBlogPosts } from "@/services/blogPosts";
import { fetchAllCmsPages } from "@/services/cmsPages";
import {
  countAnalyticsRows,
  countUniqueHumanVisitors,
  fetchBotLeaderboard,
  fetchDeviceBrowserBreakdown,
  fetchTopCountries,
  fetchConvertedJourneys,
  countLeadsInWindow,
  type AnalyticsRangeFilter,
  type TrafficTypeFilter,
  type JourneyRecord,
} from "@/services/unifiedAnalytics";
import { ListSkeleton } from "@/components/ui/list-skeleton";

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

const AdminInsights = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filter state
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("7d");
  const [trafficType, setTrafficType] = useState<TrafficTypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "blog" | "page">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");

  // Data state
  const [loading, setLoading] = useState(true);
  const [humanReach, setHumanReach] = useState(0);
  const [aiMindshare, setAiMindshare] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [topCountries, setTopCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [devices, setDevices] = useState<Array<{ name: string; count: number }>>([]);
  const [browsers, setBrowsers] = useState<Array<{ name: string; count: number }>>([]);
  const [botLeaderboard, setBotLeaderboard] = useState<Array<{ entity_name: string; count: number }>>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
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
  const refreshAll = async () => {
    setLoading(true);
    try {
      const [
        uniqueHumans, botCountResult, leadsResult,
        countriesResult, deviceResult, leaderboardResult,
        journeysResult, blogResult, pageResult,
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
        fetchAllBlogPosts(),
        fetchAllCmsPages(),
      ]);

      setHumanReach(uniqueHumans.count ?? 0);
      setAiMindshare(botCountResult.count ?? 0);
      setLeadsCount(leadsResult.count ?? 0);
      setTopCountries(countriesResult.data || []);
      setDevices(deviceResult.devices || []);
      setBrowsers(deviceResult.browsers || []);
      setBotLeaderboard(leaderboardResult.data || []);
      setJourneys(journeysResult.data || []);

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
  };

  useEffect(() => { if (isAdmin) refreshAll(); }, [isAdmin, filters]);

  if (!authChecked) {
    return (
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
        <p className="font-body text-sm" style={{ color: "hsl(260 20% 40%)" }}>Loading…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
        <p className="font-body text-sm" style={{ color: "hsl(260 20% 40%)" }}>Access denied.</p>
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
    <div className="admin-light min-h-screen" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/admin" className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider" style={{ color: "hsl(260 20% 40%)" }}>
            <ArrowLeft size={14} /> Back to Admin
          </Link>
          <button onClick={refreshAll} disabled={loading}
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "hsl(280 55% 24%)", color: "hsl(50 82% 87%)" }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "hsl(260 20% 10%)" }}>
            Unified Insights
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: "hsl(260 20% 40%)" }}>
            Human visitors, AI crawlers, and the journey from one to a lead.
          </p>
        </div>

        {/* ── Filter bar ── */}
        <div className="rounded-xl border bg-white p-3 flex flex-wrap items-center gap-2" style={{ borderColor: "hsl(260 20% 88%)" }}>
          {/* Date range */}
          <div className="flex items-center gap-1 rounded-md border overflow-hidden" style={{ borderColor: "hsl(260 20% 88%)" }}>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => setDateRangeKey(opt.key)}
                className="px-3 py-1.5 font-body text-xs transition-colors"
                style={{
                  backgroundColor: dateRangeKey === opt.key ? "hsl(280 55% 24% / 0.12)" : "transparent",
                  color: dateRangeKey === opt.key ? "hsl(280 55% 24%)" : "hsl(260 20% 40%)",
                }}>{opt.label}</button>
            ))}
          </div>
          {/* Traffic type */}
          <div className="flex items-center gap-1 rounded-md border overflow-hidden" style={{ borderColor: "hsl(260 20% 88%)" }}>
            {(["all", "human", "bot"] as TrafficTypeFilter[]).map((t) => (
              <button key={t} onClick={() => setTrafficType(t)}
                className="px-3 py-1.5 font-body text-xs capitalize transition-colors"
                style={{
                  backgroundColor: trafficType === t ? "hsl(46 75% 40% / 0.18)" : "transparent",
                  color: trafficType === t ? "hsl(46 75% 25%)" : "hsl(260 20% 40%)",
                }}>{t === "all" ? "Combined" : t === "human" ? "Humans" : "Bots"}</button>
            ))}
          </div>
          {/* Category */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="px-3 py-1.5 rounded-md border font-body text-xs"
            style={{ borderColor: "hsl(260 20% 88%)", backgroundColor: "white", color: "hsl(260 20% 25%)" }}>
            <option value="all">All content</option>
            <option value="blog">Blogs only</option>
            <option value="page">Pages only</option>
          </select>
          {/* Country */}
          {allCountries.length > 0 && (
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border font-body text-xs"
              style={{ borderColor: "hsl(260 20% 88%)", backgroundColor: "white", color: "hsl(260 20% 25%)" }}>
              <option value="all">All countries</option>
              {allCountries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* ── Section A: Hero metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Users size={16} />} label="Human Reach" value={humanReach.toString()}
            hint="Unique visitors in window" accentHsl="280 55% 24%" />
          <StatCard icon={<Bot size={16} />} label="AI Mindshare" value={aiMindshare.toString()}
            hint="Crawler hits in window" accentHsl="46 75% 40%" />
          <StatCard icon={<Sparkles size={16} />} label="Conversion Index" value={`${conversionIndex}%`}
            hint={`${leadsCount} leads from ${humanReach} visitors`} accentHsl="280 57% 13%" />
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
                      <div className="flex justify-between font-body text-xs"><span>{c.country}</span><span style={{ color: "hsl(260 20% 50%)" }}>{c.count}</span></div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(260 20% 92%)" }}>
                        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: "hsl(280 55% 24%)" }} />
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
                    <span className="flex items-center gap-2" style={{ color: "hsl(260 20% 25%)" }}>{deviceIcon(d.name)} {d.name}</span>
                    <span style={{ color: "hsl(260 20% 50%)" }}>{Math.round((d.count / totalDeviceCount) * 100)}% · {d.count}</span>
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
                    <span style={{ color: "hsl(260 20% 25%)" }}>{b.name}</span>
                    <span style={{ color: "hsl(260 20% 50%)" }}>{Math.round((b.count / totalBrowserCount) * 100)}% · {b.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Path to Lead */}
        <Panel title="Path to Lead" loading={loading}>
          {journeys.length === 0 ? (
            <Empty>No converted visitors yet — once someone fills a lead form, their visit history appears here.</Empty>
          ) : (
            <ul className="space-y-2">
              {journeys.map((j, idx) => (
                <li key={idx} className="p-2.5 rounded-lg border" style={{ borderColor: "hsl(260 20% 90%)", backgroundColor: "hsl(30 20% 99%)" }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-body text-xs font-semibold truncate" style={{ color: "hsl(260 20% 10%)" }}>{j.stitched_email}</span>
                    <span className="font-body text-[10px]" style={{ color: "hsl(260 20% 55%)" }}>{new Date(j.converted_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap font-body text-[11px]" style={{ color: "hsl(260 20% 45%)" }}>
                    {j.path_sequence.slice(0, 6).map((p, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "hsl(280 55% 24% / 0.08)" }}>{p}</span>
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
                    <span className="truncate" style={{ color: "hsl(260 20% 25%)" }}>{b.entity_name.split(" (")[0]}</span>
                    <span style={{ color: "hsl(46 75% 25%)" }}>{b.count}</span>
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
                    <li key={`${row.kind}-${row.id}`} className="flex items-start justify-between gap-3 p-3 rounded-lg border" style={{ borderColor: "hsl(260 20% 90%)", backgroundColor: "hsl(30 20% 99%)" }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tag color={row.kind === "blog" ? "purple" : "gold"}>{row.kind}</Tag>
                          <Tag color={row.status === "published" ? "green" : "amber"}>{row.status}</Tag>
                          <Tag color={row.optimized ? "green" : "red"}>{row.optimized ? "Optimised" : "Needs summary"}</Tag>
                        </div>
                        <div className="font-body text-sm font-medium mt-1.5 truncate" style={{ color: "hsl(260 20% 10%)" }}>{row.title}</div>
                        <div className="font-body text-xs mt-0.5 line-clamp-2" style={{ color: "hsl(260 20% 45%)" }}>
                          {row.ai_summary ? `"${row.ai_summary.slice(0, 200)}${row.ai_summary.length > 200 ? "…" : ""}"` : "No AI summary set."}
                        </div>
                      </div>
                      <a href={row.kind === "blog" ? `/blog/${row.slug}` : `/p/${row.slug}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(260 20% 40%)" }} title="Open page">
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
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: "hsl(260 20% 88%)" }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-sm font-bold" style={{ color: "hsl(260 20% 10%)" }}>llms.txt manifest</h3>
              <p className="font-body text-xs mt-0.5" style={{ color: "hsl(260 20% 50%)" }}>The AI-readable index your bots crawl. Auto-updated on every blog publish.</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/llms-txt`} target="_blank" rel="noopener noreferrer"
                className="font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-70" style={{ borderColor: "hsl(260 20% 80%)", color: "hsl(260 20% 25%)" }}>
                View llms.txt <ExternalLink size={11} className="inline ml-1" />
              </a>
              <a href={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/llms-txt?full=1`} target="_blank" rel="noopener noreferrer"
                className="font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full text-muted bg-primary" style={{ backgroundColor: "hsl(280 55% 24%)", color: "hsl(50 82% 87%)" }}>
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
  <div className="rounded-xl border p-4 sm:p-5 bg-white" style={{ borderColor: "hsl(260 20% 88%)" }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ backgroundColor: `hsl(${accentHsl} / 0.1)`, color: `hsl(${accentHsl})` }}>{icon}</span>
      <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(260 20% 45%)" }}>{label}</span>
    </div>
    <div className="font-display text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "hsl(260 20% 10%)" }}>{value}</div>
    <div className="font-body text-xs mt-1" style={{ color: "hsl(260 20% 50%)" }}>{hint}</div>
  </div>
);

const Panel = ({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) => (
  <div className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: "hsl(260 20% 88%)" }}>
    <h2 className="font-display text-base font-bold mb-3" style={{ color: "hsl(260 20% 10%)" }}>{title}</h2>
    {loading ? <ListSkeleton rows={4} rowHeight="h-8" /> : children}
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="font-body text-xs py-4 text-center" style={{ color: "hsl(260 20% 50%)" }}>{children}</p>
);

const Tag = ({ color, children }: { color: "purple" | "gold" | "green" | "red" | "amber"; children: React.ReactNode }) => {
  const palette: Record<string, { bg: string; fg: string }> = {
    purple: { bg: "hsl(280 55% 24% / 0.10)", fg: "hsl(280 55% 24%)" },
    gold:   { bg: "hsl(46 75% 40% / 0.18)",  fg: "hsl(46 75% 25%)" },
    green:  { bg: "hsl(140 50% 90%)",        fg: "hsl(140 60% 25%)" },
    red:    { bg: "hsl(0 60% 95%)",          fg: "hsl(0 60% 40%)" },
    amber:  { bg: "hsl(40 80% 90%)",         fg: "hsl(40 80% 30%)" },
  };
  const p = palette[color];
  return <span className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: p.bg, color: p.fg }}>{children}</span>;
};

export default AdminInsights;
