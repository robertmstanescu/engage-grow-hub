/**
 * AdminOverviewDashboard — EPIC 3 / US 3.1
 *
 * The landing page admins see when they log in. Replaces the old behaviour
 * of dropping the user straight into the Site Editor canvas. Provides:
 *
 *   1. Quick Stats — Total Pages, Leads Captured, Blog Posts.
 *   2. Recent Edits — last few page_revisions (any entity type).
 *   3. A prominent "Create New Page" CTA that hands off to PagesManager.
 *
 * This is purely an overview surface. It NEVER mutates content — every
 * action either reads aggregate counts or routes the user into one of
 * the existing tabs (Pages / Site Editor / Blog) where the real work
 * happens.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Users, BookOpen, Plus, Clock, ArrowRight } from "lucide-react";

type TabKey =
  | "overview"
  | "site"
  | "pages"
  | "navigation"
  | "blog"
  | "contacts"
  | "emails"
  | "media"
  | "brand"
  | "tags"
  | "settings"
  | "team"
  | "seo_master"
  | "versions";

interface Props {
  onNavigate: (tab: TabKey) => void;
  /**
   * Called when the user clicks "Create New Page". The PagesManager owns
   * the actual create-page modal, so the dashboard simply switches tabs
   * and signals intent via this callback.
   */
  onCreatePage: () => void;
}

interface QuickStats {
  pages: number;
  leads: number;
  posts: number;
}

interface RecentEdit {
  id: string;
  entity_type: string;
  entity_ref: string;
  label: string | null;
  created_at: string;
}

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  value: number | string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col gap-2 p-5 rounded-2xl border bg-card text-left transition hover:border-secondary/60 hover:shadow-lg"
    style={{ borderColor: "hsl(var(--border))" }}
  >
    <div className="flex items-center justify-between">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "hsl(var(--secondary) / 0.1)", color: "hsl(var(--secondary))" }}
      >
        <Icon size={18} />
      </div>
      <ArrowRight
        size={14}
        className="opacity-0 -translate-x-1 transition group-hover:opacity-60 group-hover:translate-x-0 text-muted-foreground"
      />
    </div>
    <div className="font-display text-3xl font-black leading-none" style={{ color: "hsl(var(--foreground))" }}>
      {value}
    </div>
    <div className="font-body text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
  </button>
);

const AdminOverviewDashboard = ({ onNavigate, onCreatePage }: Props) => {
  const [stats, setStats] = useState<QuickStats>({ pages: 0, leads: 0, posts: 0 });
  const [recent, setRecent] = useState<RecentEdit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // We use head:true + count:'exact' so we never pull row data we don't
      // need — only the count metadata comes back. Three parallel queries
      // keep the dashboard's first paint snappy on cold loads.
      const [pagesQ, leadsQ, postsQ, recentQ] = await Promise.all([
        supabase.from("cms_pages").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase
          .from("page_revisions")
          .select("id, entity_type, entity_ref, label, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (cancelled) return;
      setStats({
        pages: pagesQ.count ?? 0,
        leads: leadsQ.count ?? 0,
        posts: postsQ.count ?? 0,
      });
      setRecent((recentQ.data as RecentEdit[]) || []);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const entityTabFor = (entityType: string): TabKey => {
    if (entityType === "blog_post") return "blog";
    if (entityType === "cms_page") return "pages";
    return "site";
  };

  const entityLabelFor = (entityType: string) => {
    if (entityType === "blog_post") return "Blog post";
    if (entityType === "cms_page") return "CMS page";
    if (entityType === "site_content") return "Site section";
    return entityType;
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      {/* Hero / Welcome */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Admin Dashboard
          </p>
          <h1
            className="font-display text-3xl md:text-4xl font-black mt-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Welcome back
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-2 max-w-lg">
            A quick overview of your platform. Jump into a section below or create
            something new.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreatePage}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-display text-[11px] uppercase tracking-[0.12em] font-bold hover:opacity-90 transition shadow-lg text-black bg-accent"
        >
          <Plus size={14} />
          Create New Page
        </button>
      </header>

      {/* Quick Stats */}
      <section>
        <h2 className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Quick Stats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={FileText}
            label="Total Pages"
            value={loading ? "—" : stats.pages}
            onClick={() => onNavigate("pages")}
          />
          <StatCard
            icon={Users}
            label="Leads Captured"
            value={loading ? "—" : stats.leads}
            onClick={() => onNavigate("contacts")}
          />
          <StatCard
            icon={BookOpen}
            label="Blog Posts"
            value={loading ? "—" : stats.posts}
            onClick={() => onNavigate("blog")}
          />
        </div>
      </section>

      {/* Recent Edits */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Recent Edits
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("versions")}
            className="font-body text-[11px] text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
          >
            View history <ArrowRight size={12} />
          </button>
        </div>
        <div className="rounded-2xl border bg-card overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
          {loading ? (
            <div className="p-6 font-body text-sm text-muted-foreground">Loading recent activity…</div>
          ) : recent.length === 0 ? (
            <div className="p-6 font-body text-sm text-muted-foreground">
              No edits yet — your changes will appear here.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "hsl(var(--border))" }}>
              {recent.map((rev) => (
                <li key={rev.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(entityTabFor(rev.entity_type))}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 transition"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                    >
                      <Clock size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-body text-sm font-medium truncate"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {rev.label || rev.entity_ref}
                      </div>
                      <div className="font-body text-[11px] text-muted-foreground mt-0.5">
                        {entityLabelFor(rev.entity_type)} · {formatRelative(rev.created_at)}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Jump to
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "site" as TabKey, label: "Site Editor" },
            { key: "pages" as TabKey, label: "Pages" },
            { key: "blog" as TabKey, label: "Blog" },
            { key: "media" as TabKey, label: "Media" },
          ].map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => onNavigate(a.key)}
              className="px-4 py-3 rounded-xl border bg-card text-left font-body text-sm hover:border-secondary/60 transition"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminOverviewDashboard;
