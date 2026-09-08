/**
 * Overview — what needs the owner today, nothing else.
 *
 * Pages with unpublished changes, drafts, new leads and live pages
 * without a search description, each with the one button that deals
 * with it. The old stat tiles and quick-action grid repeated the rail;
 * they are gone. Derivation lives in overviewTasks.ts (unit-tested).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import type { AdminTab } from "./navigation";
import { deriveTasks, greeting, relativeTime, summarize, type HomeLite, type LeadLite, type PageLite, type PostLite, type Summary, type Task } from "./overviewTasks";

interface Props {
  onGo: (tab: AdminTab, sub?: string) => void;
  onOpenInBuilder: (page: { id: string; slug: string; title: string } | null) => void;
}

interface Snapshot {
  tasks: Task[];
  summary: Summary;
  lastPublished: { title: string; when: string } | null;
  pages: Record<string, { slug: string; title: string }>;
}

const AdminOverviewDashboard = ({ onGo, onOpenInBuilder }: Props) => {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pagesQ, postsQ, leadsQ, homeQ] = await Promise.all([
        supabase.from("cms_pages").select("id, title, slug, status, updated_at, meta_description, page_rows, draft_page_rows").order("updated_at", { ascending: false }),
        supabase.from("blog_posts").select("id, title, slug, status, updated_at, published_at").order("updated_at", { ascending: false }),
        supabase.from("leads").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("site_content").select("content, draft_content, updated_at").eq("section_key", "page_rows").maybeSingle(),
      ]);
      if (cancelled) return;
      const pages = (pagesQ.data || []) as unknown as PageLite[];
      const posts = (postsQ.data || []) as unknown as (PostLite & { published_at: string | null })[];
      const leads = (leadsQ.data || []) as unknown as LeadLite[];
      const home = (homeQ.data || null) as unknown as HomeLite | null;
      const tasks = deriveTasks({ pages, posts, leads, home });
      const summary = summarize({ pages, posts, leads, home });
      const published = [
        ...pages.filter((p) => p.status === "published").map((p) => ({ title: p.title, at: p.updated_at })),
        ...posts.filter((p) => p.status === "published").map((p) => ({ title: p.title, at: p.published_at || p.updated_at })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
      setSnap({
        tasks,
        summary,
        lastPublished: published ? { title: published.title, when: relativeTime(published.at) } : null,
        pages: Object.fromEntries(pages.map((p) => [p.id, { slug: p.slug, title: p.title }])),
      });
    })().catch(() => setSnap({ tasks: [], summary: { changes: 0, draftPosts: 0, latestDraftTitle: null, leadsThisWeek: 0, leadNames: [] }, lastPublished: null, pages: {} }));
    return () => { cancelled = true; };
  }, []);

  const act = (t: Task) => {
    if (t.go.tab === "builder") {
      if (t.go.pageId == null) onOpenInBuilder(null);
      else { const p = snap?.pages[t.go.pageId]; if (p) onOpenInBuilder({ id: t.go.pageId, ...p }); }
      return;
    }
    onGo(t.go.tab, t.go.sub);
  };

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const sum = snap?.summary;
  const tile = (n: number, label: string, action: string, onClick: () => void, dim: boolean) => (
    <div className={`admin-tile${dim ? " quiet" : ""}`}>
      <div className="admin-tile-n">{n}</div>
      <div className="admin-tile-l">{label}</div>
      <button type="button" className="admin-link" onClick={onClick} disabled={dim}>{action}</button>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="admin-page-head" style={{ alignItems: "flex-end" }}>
        <div>
          <h2 className="admin-h1">{greeting(new Date(), "Robert")}</h2>
          <p className="admin-sub">{today}. What needs you today; everything else is where you left it.</p>
        </div>
      </div>
      {sum && (
        <div className="admin-tiles">
          {tile(sum.changes, sum.changes === 1 ? "page with unpublished changes" : "pages with unpublished changes", "Review and publish", () => onGo("pages"), sum.changes === 0)}
          {tile(sum.draftPosts, sum.draftPosts === 1 ? `draft blog post${sum.latestDraftTitle ? "" : ""}` : "draft blog posts", sum.latestDraftTitle ? `Open “${sum.latestDraftTitle.length > 28 ? sum.latestDraftTitle.slice(0, 28) + "…" : sum.latestDraftTitle}”` : "Open blog", () => onGo("blog"), sum.draftPosts === 0)}
          {tile(sum.leadsThisWeek, sum.leadsThisWeek === 1 ? "new lead this week" : "new leads this week", sum.leadNames.length ? `See ${sum.leadNames.slice(0, 2).join(", ")}` : "See leads", () => onGo("audience", "contacts"), sum.leadsThisWeek === 0)}
        </div>
      )}
      {!snap ? (
        <ListSkeleton rows={4} rowHeight="h-10" />
      ) : snap.tasks.length === 0 ? (
        <div className="admin-panel admin-empty">Nothing waiting. Every page is published and there are no new leads this week.</div>
      ) : (
        <div className="admin-panel admin-todo" role="list">
          {snap.tasks.map((t, i) => (
            <div key={i} className="admin-todo-item" role="listitem">
              <span className={`admin-dot ${t.kind}`} aria-hidden />
              <div className="min-w-0">
                <span className="admin-todo-title">{t.title}</span>
                {t.detail && <span className="admin-todo-detail"> · {t.detail}</span>}
              </div>
              <button type="button" className="admin-btn" onClick={() => act(t)}>{t.action}</button>
            </div>
          ))}
        </div>
      )}
      {snap?.lastPublished && (
        <p className="admin-sub" style={{ marginTop: 14 }}>
          Last published: {snap.lastPublished.title}, {snap.lastPublished.when}.
        </p>
      )}
    </div>
  );
};

export default AdminOverviewDashboard;
