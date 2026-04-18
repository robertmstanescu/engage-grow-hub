/**
 * AdminAiInsights — "/admin/ai-insights"
 * ──────────────────────────────────────────────────────────────────────────
 * Mission control for AI discoverability:
 *   • AI Visibility Score      — % of blogs+pages with an AI summary filled in
 *   • Crawler Activity (24h)   — total bot hits in the last day
 *   • Most Interested AI       — bot with the highest hit count this week
 *   • Content Audit            — every blog/page, with summary + optimized flag
 *   • Live Feed                — last 20 AI bot visits
 *
 * Typography: keeps brand consistency — Unbounded headers, Inter body
 * (per project memory `mem://brand/identity`). The user explicitly chose
 * to override the spec's "Bricolage Grotesque" so the dashboard matches
 * the rest of the admin.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Activity, Bot, Sparkles, RefreshCw, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllBlogPosts } from "@/services/blogPosts";
import { fetchAllCmsPages } from "@/services/cmsPages";
import {
  fetchRecentAiCrawlerLogs,
  countAiCrawlerHitsSince,
  fetchTopAiCrawlerBots,
  type AiCrawlerLogRecord,
} from "@/services/aiCrawlerLogs";
import { ListSkeleton } from "@/components/ui/list-skeleton";

interface AuditRowItem {
  id: string;
  title: string;
  slug: string;
  kind: "blog" | "page";
  status: string;
  ai_summary: string | null;
  optimized: boolean;
}

/**
 * Compute whether an AI summary is "high quality" enough to count as
 * optimized. Threshold: at least 60 characters, ideally < 320.
 *
 * Why this matters: a 5-word summary tells crawlers nothing useful, but a
 * 5-paragraph summary defeats the point of a snippet. The 60-320 window
 * mirrors the meta-description sweet spot.
 */
function isAiSummaryOptimized(summary: string | null | undefined): boolean {
  if (!summary) return false;
  const trimmed = summary.trim();
  return trimmed.length >= 60 && trimmed.length <= 320;
}

const AdminAiInsights = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [auditRows, setAuditRows] = useState<AuditRowItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<AiCrawlerLogRecord[]>([]);
  const [activity24h, setActivity24h] = useState<number>(0);
  const [topBots, setTopBots] = useState<{ bot_name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Gate the page on admin status. The Admin route already does this
  //    for the dashboard; we re-check here because this page is a
  //    standalone route (not nested inside <Admin>).
  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin");
        return;
      }
      const { data } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setIsAdmin(!!data);
      setAuthChecked(true);
    };
    checkAdminStatus();
  }, [navigate]);

  /**
   * Pull the data needed for every panel in parallel.
   * We re-use the same routine for the manual "Refresh" button.
   */
  const fetchAiOptimizationStatus = async () => {
    setLoading(true);
    try {
      const [blogResult, pageResult, logsResult, countResult, topBotsResult] = await Promise.all([
        fetchAllBlogPosts(),
        fetchAllCmsPages(),
        fetchRecentAiCrawlerLogs(20),
        countAiCrawlerHitsSince(24),
        fetchTopAiCrawlerBots(168),
      ]);

      const blogRows: AuditRowItem[] = (blogResult.data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        kind: "blog",
        status: post.status,
        ai_summary: post.ai_summary ?? null,
        optimized: isAiSummaryOptimized(post.ai_summary),
      }));
      const pageRows: AuditRowItem[] = (pageResult.data || []).map((page: any) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        kind: "page",
        status: page.status,
        ai_summary: page.ai_summary ?? null,
        optimized: isAiSummaryOptimized(page.ai_summary),
      }));

      setAuditRows([...pageRows, ...blogRows]);
      setRecentLogs((logsResult.data as AiCrawlerLogRecord[]) || []);
      setActivity24h(countResult.count ?? 0);
      setTopBots(topBotsResult.data || []);
    } catch (loadError) {
      console.error("AI Insights load failed:", loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchAiOptimizationStatus();
  }, [isAdmin]);

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

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalAuditRows = auditRows.length;
  const optimizedCount = auditRows.filter((row) => row.optimized).length;
  const visibilityScore = totalAuditRows > 0
    ? Math.round((optimizedCount / totalAuditRows) * 100)
    : 0;
  const mostInterestedBot = topBots[0]?.bot_name || "No AI activity yet";
  const mostInterestedHits = topBots[0]?.count || 0;
  const filteredAuditRows = searchQuery
    ? auditRows.filter((row) =>
        `${row.title} ${row.slug} ${row.ai_summary ?? ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
    : auditRows;

  return (
    <div className="admin-light min-h-screen" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider"
              style={{ color: "hsl(260 20% 40%)" }}
            >
              <ArrowLeft size={14} /> Back to Admin
            </Link>
          </div>
          <button
            onClick={fetchAiOptimizationStatus}
            disabled={loading}
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "hsl(280 55% 24%)", color: "hsl(50 82% 87%)" }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div>
          <h1
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "hsl(260 20% 10%)" }}
          >
            AI Insights
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: "hsl(260 20% 40%)" }}>
            How AI assistants are discovering and indexing your site.
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Sparkles size={16} />}
            label="AI Visibility Score"
            value={`${visibilityScore}%`}
            hint={`${optimizedCount} of ${totalAuditRows} pages optimized`}
            accentHsl="280 55% 24%"
          />
          <StatCard
            icon={<Activity size={16} />}
            label="Crawler Activity (24h)"
            value={activity24h.toString()}
            hint="AI bot hits in the last day"
            accentHsl="46 75% 40%"
          />
          <StatCard
            icon={<Bot size={16} />}
            label="Most Interested AI"
            value={mostInterestedBot.split(" (")[0]}
            hint={mostInterestedHits > 0 ? `${mostInterestedHits} hits this week` : "Waiting for crawlers…"}
            accentHsl="280 57% 13%"
          />
        </div>

        {/* ── Note about measurement ── */}
        <div
          className="rounded-lg p-3 border text-xs font-body"
          style={{ borderColor: "hsl(46 75% 40% / 0.4)", backgroundColor: "hsl(46 75% 60% / 0.08)", color: "hsl(260 20% 25%)" }}
        >
          ℹ️ Crawler hits are recorded when bots fetch <code>/llms.txt</code>, <code>/llms-full.txt</code>, or render any page with JavaScript.
          Pure text crawlers on other pages are not counted.
        </div>

        {/* ── Two-column: Content Audit + Live Feed ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Content Audit */}
          <div className="lg:col-span-2 rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: "hsl(260 20% 88%)" }}>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="font-display text-lg font-bold" style={{ color: "hsl(260 20% 10%)" }}>
                Content Audit
              </h2>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "hsl(260 20% 50%)" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="pl-7 pr-3 py-1.5 rounded-full font-body text-xs border"
                  style={{ borderColor: "hsl(260 20% 80%)", backgroundColor: "hsl(30 20% 99%)", color: "hsl(260 20% 10%)" }}
                />
              </div>
            </div>

            {loading ? (
              <ListSkeleton rows={5} rowHeight="h-12" />
            ) : filteredAuditRows.length === 0 ? (
              <p className="font-body text-sm py-8 text-center" style={{ color: "hsl(260 20% 50%)" }}>
                {searchQuery ? "No content matches your search." : "No blog posts or pages yet."}
              </p>
            ) : (
              <ul className="space-y-2 max-h-[460px] overflow-y-auto">
                {filteredAuditRows.map((row) => (
                  <li
                    key={`${row.kind}-${row.id}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border"
                    style={{ borderColor: "hsl(260 20% 90%)", backgroundColor: "hsl(30 20% 99%)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: row.kind === "blog" ? "hsl(280 55% 24% / 0.1)" : "hsl(46 75% 40% / 0.15)",
                            color: row.kind === "blog" ? "hsl(280 55% 24%)" : "hsl(46 75% 25%)",
                          }}
                        >
                          {row.kind}
                        </span>
                        <span
                          className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: row.status === "published" ? "hsl(140 50% 90%)" : "hsl(40 80% 90%)",
                            color: row.status === "published" ? "hsl(140 60% 25%)" : "hsl(40 80% 30%)",
                          }}
                        >
                          {row.status}
                        </span>
                        <span
                          className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: row.optimized ? "hsl(140 50% 90%)" : "hsl(0 60% 95%)",
                            color: row.optimized ? "hsl(140 60% 25%)" : "hsl(0 60% 40%)",
                          }}
                        >
                          {row.optimized ? "Optimized" : "Needs summary"}
                        </span>
                      </div>
                      <div className="font-body text-sm font-medium mt-1.5 truncate" style={{ color: "hsl(260 20% 10%)" }}>
                        {row.title}
                      </div>
                      <div className="font-body text-xs mt-0.5 line-clamp-2" style={{ color: "hsl(260 20% 45%)" }}>
                        {row.ai_summary
                          ? `“${row.ai_summary.slice(0, 200)}${row.ai_summary.length > 200 ? "…" : ""}”`
                          : "No AI summary set — crawlers will fall back to the excerpt."}
                      </div>
                    </div>
                    <a
                      href={row.kind === "blog" ? `/blog/${row.slug}` : `/p/${row.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:opacity-70"
                      style={{ color: "hsl(260 20% 40%)" }}
                      title="Open page"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live Feed */}
          <div className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: "hsl(260 20% 88%)" }}>
            <h2 className="font-display text-lg font-bold mb-3" style={{ color: "hsl(260 20% 10%)" }}>
              Live Feed
            </h2>
            {loading ? (
              <ListSkeleton rows={5} rowHeight="h-10" />
            ) : recentLogs.length === 0 ? (
              <p className="font-body text-sm py-8 text-center" style={{ color: "hsl(260 20% 50%)" }}>
                No AI crawler hits yet.
                <br />
                <span className="text-xs">They'll appear here as bots discover your site.</span>
              </p>
            ) : (
              <ul className="space-y-2 max-h-[460px] overflow-y-auto">
                {recentLogs.map((log) => (
                  <li
                    key={log.id}
                    className="p-2.5 rounded-lg border"
                    style={{ borderColor: "hsl(260 20% 90%)", backgroundColor: "hsl(30 20% 99%)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-body text-xs font-semibold truncate" style={{ color: "hsl(260 20% 10%)" }}>
                        {log.bot_name}
                      </span>
                      <span className="font-body text-[10px]" style={{ color: "hsl(260 20% 55%)" }}>
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="font-body text-[11px] truncate mt-0.5" style={{ color: "hsl(260 20% 45%)" }}>
                      {log.page_path}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accentHsl: string;
}

/**
 * Single stat card. Renders a label, a large headline value, and a small
 * supporting hint underneath. The accent colour tints the icon badge.
 */
const StatCard = ({ icon, label, value, hint, accentHsl }: StatCardProps) => (
  <div
    className="rounded-xl border p-4 sm:p-5 bg-white"
    style={{ borderColor: "hsl(260 20% 88%)" }}
  >
    <div className="flex items-center gap-2 mb-2">
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full"
        style={{ backgroundColor: `hsl(${accentHsl} / 0.1)`, color: `hsl(${accentHsl})` }}
      >
        {icon}
      </span>
      <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(260 20% 45%)" }}>
        {label}
      </span>
    </div>
    <div className="font-display text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "hsl(260 20% 10%)" }}>
      {value}
    </div>
    <div className="font-body text-xs mt-1" style={{ color: "hsl(260 20% 50%)" }}>
      {hint}
    </div>
  </div>
);

export default AdminAiInsights;
