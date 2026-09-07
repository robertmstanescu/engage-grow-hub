/**
 * AdminDashboard — the admin shell.
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ TOPBAR  (favicon · page/tab title · preview live · profile)   │
 *   ├──────────┬────────────────────────────────────────────────────┤
 *   │ Sidebar  │ Main area: one list-style tab (Pages, Blogs, Media, │
 *   │ (icons,  │ …) — or, on the Site tab, the full-screen page      │
 *   │ expands  │ builder (SiteEditor for the homepage, CmsPageBuilder │
 *   │ on hover)│ for a CMS page), which overlays this whole shell.    │
 *   └──────────┴────────────────────────────────────────────────────┘
 *
 * Mobile (<768px) collapses the sidebar into an off-canvas drawer.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO
 * ───────────────────────────────────────
 * It does not edit content. Until the admin cleanup (Step A) this file
 * also carried the pre-builder editor — its own section rail, drag-to-
 * reorder, a properties panel hosting RowContentEditor / StyleTab /
 * HeroEditor, a debounced auto-save loop and a second copy of the
 * draft/publish logic. That path had been unreachable since the visual
 * builder took over both page types, so it was deleted rather than kept
 * in sync. Every row edit now goes through PageBuilderShell →
 * InspectorPanel → RowTypeEditor, and every save/publish through the
 * builder adapters (SiteEditor, CmsPageBuilder, BlogPostBuilder).
 *
 * The only editor state that lives here is what the in-app navigation
 * guard needs: the mounted adapter reports its unsaved-changes flag
 * (`onDirtyChange`) and registers a save function (`onRegisterSave`) so
 * the "Leave without saving?" dialog can offer "Save all & leave".
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runDbAction } from "@/services/db-helpers";
import { useSiteContent } from "@/hooks/useSiteContent";
import {
  LayoutDashboard, FileText, Compass, BookOpen,
  Users, Mail, Image, Palette, Settings, LogOut,
  Tag, UserCog, ArrowLeft, X, Sparkles, Menu,
  Search, History, Link2,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams, useBlocker } from "react-router-dom";
import AdminOverviewDashboard from "./AdminOverviewDashboard";
import ManageTeam from "./ManageTeam";
import BlogEditor from "./BlogEditor";
import ContactsList from "./ContactsList";
import EmailCampaigns from "./EmailCampaigns";
import TagsManager from "./TagsManager";
import RedirectsManager from "./RedirectsManager";
import PagesManager from "./PagesManager";
import NavigationManager from "./NavigationManager";
import GlobalSettings from "./GlobalSettings";
import MediaGallery from "./MediaGallery";
import BrandSettings from "./BrandSettings";
import SeoMaster from "./SeoMaster";
import VersionHistory from "./VersionHistory";
import { confirmUnsavedExit } from "@/components/ConfirmDialog";
import SiteEditor from "./SiteEditor";
import CmsPageBuilder from "./builder/CmsPageBuilder";

/**
 * useIsAdminMobile
 * Local hook (NOT the global useIsMobile, which uses a 1024px tablet
 * breakpoint). The admin panel only needs to switch into drawer mode on
 * actual phones (< 768px), so we listen on our own media query.
 */
const useIsAdminMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isMobile;
};

type Tab = "overview" | "site" | "pages" | "navigation" | "blog" | "contacts" | "emails" | "media" | "brand" | "tags" | "redirects" | "settings" | "team" | "seo_master" | "versions";

/** Every Tab except "overview" and "site" — those two have their own
 *  dedicated routes (/admin/dashboard, /admin/site[/pages/:id]); every
 *  other tab is reached via the generic /admin/:tab catch-all. Kept as
 *  a runtime Set so a bad/typo'd URL segment falls back to "overview"
 *  instead of rendering a blank tab. */
const SIMPLE_TABS = new Set<Tab>([
  "pages", "navigation", "blog", "contacts", "emails", "media",
  "brand", "tags", "redirects", "settings", "team", "seo_master", "versions",
]);
const tabToPath = (tab: Tab): string => (tab === "overview" ? "/admin/dashboard" : `/admin/${tab}`);

interface Props { session: any; }

/* US 4.2 — Dashboard Nomenclature & Taxonomy
 * Tab keys ("site", "pages", "seo_master") are STABLE — they're used by
 * routing, persisted state, and analytics. Only the human-facing `label`
 * strings may change. Do not rename the keys without a coordinated
 * migration of any URL deep-links that reference them. */
type NavItem = { key: Tab | "insights"; icon: typeof LayoutDashboard; label: string };
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [
      { key: "overview", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { key: "site", icon: FileText, label: "Site" },
      { key: "pages", icon: FileText, label: "Pages" },
      { key: "blog", icon: BookOpen, label: "Blogs" },
      { key: "media", icon: Image, label: "Media" },
    ],
  },
  {
    label: "AUDIENCE",
    items: [
      { key: "contacts", icon: Users, label: "Contacts" },
      { key: "emails", icon: Mail, label: "Campaigns" },
    ],
  },
  {
    label: "STRUCTURE",
    items: [
      { key: "navigation", icon: Compass, label: "Navigation" },
      { key: "tags", icon: Tag, label: "Tags" },
      { key: "redirects", icon: Link2, label: "Redirects" },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { key: "insights", icon: Sparkles, label: "Analytics" },
      { key: "seo_master", icon: Search, label: "SEO" },
      { key: "versions", icon: History, label: "Version History" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { key: "brand", icon: Palette, label: "Brand" },
      { key: "settings", icon: Settings, label: "Settings" },
      { key: "team", icon: UserCog, label: "Team" },
    ],
  },
];

interface CmsPageRef {
  id: string;
  slug: string;
  title: string;
}

const AdminDashboard = (_props: Props) => {
  // EPIC 3 / US 3.1 — admins land on the overview dashboard, not the
  // raw site editor, so nobody fat-fingers a layout the moment they log in.
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ tab?: string; pageId?: string }>();

  // ── activeTab is DERIVED from the URL, not stored locally ──
  // The URL is the single source of truth so Back/Forward always match
  // what's on screen; navigate() is how every screen change happens.
  const isSiteRoute = location.pathname === "/admin/site" || location.pathname.startsWith("/admin/site/");
  const activeTab: Tab = isSiteRoute
    ? "site"
    : SIMPLE_TABS.has(params.tab as Tab)
      ? (params.tab as Tab)
      : "overview";

  // Set when the overview dashboard's "Create New Page" CTA is clicked.
  // Hands off to PagesManager which auto-opens its inline create form.
  const [pendingCreatePage, setPendingCreatePage] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const isAdminMobile = useIsAdminMobile();
  // Branding (favicons live here) so the admin topbar can render the
  // Light Theme Favicon as a "back to site" mark in the top-left.
  const branding = useSiteContent<Record<string, any>>("branding", {});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const toggleMobileDrawer = useCallback(() => setMobileDrawerOpen((open) => !open), []);

  // ── CMS page being edited ──
  // `cmsPage` is a local cache of {id, slug, title} for the topbar. The
  // URL's :pageId is the actual source of truth — handleEditPage seeds
  // this directly (PagesManager already has the row, no round-trip), and
  // the effect below re-fetches whenever the URL disagrees (cold load,
  // or Back/Forward landing on a /admin/site/pages/:id we didn't
  // navigate to ourselves).
  const [cmsPage, setCmsPage] = useState<CmsPageRef | null>(null);
  const urlPageId = isSiteRoute ? params.pageId : undefined;
  useEffect(() => {
    if (!urlPageId) {
      setCmsPage((prev) => (prev ? null : prev));
      return;
    }
    if (cmsPage?.id === urlPageId) return; // already in sync
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("id, slug, title")
        .eq("id", urlPageId)
        .maybeSingle();
      if (!cancelled && data) setCmsPage(data as CmsPageRef);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPageId]);

  // ── Unsaved-changes guard for IN-APP navigation ──
  // The builder adapters own their draft state. They report "there are
  // edits not yet written to the database" through onDirtyChange, and
  // register a save function through onRegisterSave so the dialog can
  // offer "Save all & leave" (persist, then continue) next to "Leave
  // without saving". react-router's useBlocker is the SPA counterpart to
  // the adapters' own useUnloadGuard (tab close / reload). Only blocks
  // when actually LEAVING the current screen (a different pathname);
  // switching search params in place is never blocked.
  const [builderDirty, setBuilderDirty] = useState(false);
  const builderSaveRef = useRef<(() => Promise<boolean>) | null>(null);
  const registerBuilderSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    builderSaveRef.current = fn;
  }, []);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      builderDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    (async () => {
      const saver = builderSaveRef.current;
      const ok = await confirmUnsavedExit(saver ? () => saver() : undefined);
      if (ok) blocker.proceed();
      else blocker.reset();
    })();
  }, [blocker]);

  const handleLogout = async () => {
    await runDbAction({
      action: () => supabase.auth.signOut(),
      successMessage: "Logged out",
    });
  };

  // ── Open a CMS page in the builder (from PagesManager) ──
  const handleEditPage = useCallback((page: CmsPageRef | null) => {
    if (!page) { navigate("/admin/site"); return; }
    setCmsPage(page);
    navigate(`/admin/site/pages/${page.id}`);
  }, [navigate]);

  // ── Exit the full-screen builder back to the dashboard overview. The
  // adapters guard this with their own unsaved-changes confirm first. ──
  const handleExitBuilder = useCallback(() => {
    navigate("/admin/dashboard");
  }, [navigate]);

  const isSiteTab = activeTab === "site";
  const pageLabel = cmsPage ? cmsPage.title : "Main Page";
  const tabLabel = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeTab)?.label || "";

  // Sidebar width depends on three flags (mobile / hover-expanded /
  // drawer) — a runtime value Tailwind can't express, so it stays inline.
  const sidebarStyle: React.CSSProperties = {
    width: isAdminMobile ? 260 : (sidebarExpanded ? 220 : 58),
    transform: isAdminMobile && !mobileDrawerOpen ? "translateX(-100%)" : "translateX(0)",
    boxShadow: isAdminMobile && mobileDrawerOpen ? "8px 0 24px -8px hsl(0 0% 0% / 0.2)" : "none",
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ═══ TOPBAR ═══
          Desktop keeps a 58px left gutter so the favicon (positioned
          absolutely below) sits above the icon rail; mobile uses normal
          padding because the rail is off-canvas. */}
      <header
        className={[
          "relative h-[52px] flex-shrink-0 flex items-center justify-between bg-card border-b border-border gap-2",
          isAdminMobile ? "px-3" : "pl-[calc(58px+1rem)] pr-4",
        ].join(" ")}
      >
        {!isAdminMobile && branding.favicon_light && (
          <a
            href="/"
            title="Back to site"
            aria-label="Back to site"
            className="absolute left-0 top-0 h-[52px] w-[58px] flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <img
              src={branding.favicon_light}
              alt="Back to site"
              style={{ width: 24, height: 24, objectFit: "contain" }}
            />
          </a>
        )}
        {isAdminMobile && (
          <button
            onClick={toggleMobileDrawer}
            aria-label="Open admin menu"
            className="w-9 h-9 rounded-lg border border-border bg-card text-foreground flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <Menu size={18} />
          </button>
        )}
        <span className="text-[11px] text-muted-foreground font-body flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap flex items-center justify-center gap-2">
          {cmsPage && (
            <button
              onClick={() => navigate("/admin/site")}
              className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground"
              title="Back to Main Page"
            >
              <ArrowLeft size={11} /> Main
            </button>
          )}
          <span>{isSiteTab ? pageLabel : tabLabel}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(cmsPage ? `/p/${cmsPage.slug}` : "/", "_blank")}
            className="text-[10px] font-body text-muted-foreground bg-transparent border-none cursor-pointer uppercase tracking-[0.1em]"
          >
            Preview live →
          </button>
          {/* Profile shortcut → /admin/profile (display name, avatar). */}
          <Link
            to="/admin/profile"
            title="Profile settings"
            className="w-7 h-7 rounded-full flex items-center justify-center font-display text-[9px] font-bold text-background no-underline"
            // Brand gradient — uses both HSL tokens, kept inline.
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
          >
            R
          </Link>
        </div>
      </header>

      {/* ═══ MAIN ROW ═══ */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile drawer backdrop — only on mobile when open. */}
        {isAdminMobile && mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden
            className="absolute inset-0 z-40 backdrop-blur-[2px]"
            style={{ background: "hsl(var(--foreground) / 0.4)" }}
          />
        )}

        {/* SIDEBAR — desktop: permanent rail that expands on hover;
            mobile: off-canvas drawer that slides in. */}
        <nav
          onMouseEnter={() => !isAdminMobile && setSidebarExpanded(true)}
          onMouseLeave={() => !isAdminMobile && setSidebarExpanded(false)}
          className={[
            "top-0 bottom-0 left-0 bg-card border-r border-border flex-shrink-0 overflow-hidden flex flex-col",
            "[transition:width_0.3s_cubic-bezier(0.16,1,0.3,1),transform_0.3s_cubic-bezier(0.16,1,0.3,1)]",
            isAdminMobile ? "absolute z-50" : "relative",
          ].join(" ")}
          style={sidebarStyle}
        >
          {isAdminMobile && (
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
              <span className="font-display text-[11px] font-bold tracking-[0.15em] text-secondary">
                MENU
              </span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close admin menu"
                className="w-8 h-8 rounded-lg border-none bg-transparent text-muted-foreground flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div
                  className="text-[8px] uppercase whitespace-nowrap transition-opacity px-[1.1rem] pt-3 pb-[0.35rem]"
                  style={{
                    color: "hsl(var(--muted-foreground) / 0.5)",
                    letterSpacing: "0.3em",
                    // Hover-expand is React state, not CSS hover, so the
                    // label fade can't use group-hover.
                    opacity: isAdminMobile || sidebarExpanded ? 1 : 0,
                  }}
                >
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const active = activeTab === item.key;
                  // `insights` is a separate route (/admin/insights), not a tab.
                  const handleClick = () => {
                    if (item.key === "insights") {
                      navigate("/admin/insights");
                      return;
                    }
                    navigate(tabToPath(item.key));
                    if (isAdminMobile) setMobileDrawerOpen(false);
                  };
                  return (
                    <button
                      key={item.key}
                      onClick={handleClick}
                      className={[
                        "flex items-center gap-2.5 w-full border-none cursor-pointer text-left transition-[background] duration-150",
                        isAdminMobile ? "px-4 py-3.5" : "px-4 py-2",
                        // The 2px left border collapses to transparent when
                        // inactive so layout doesn't shift.
                        active
                          ? "bg-secondary/15 text-secondary font-semibold border-l-2 border-secondary"
                          : "bg-transparent text-foreground/70 border-l-2 border-transparent hover:bg-foreground/[0.06] hover:text-foreground",
                      ].join(" ")}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span
                        className={[
                          "font-body whitespace-nowrap transition-opacity",
                          isAdminMobile ? "text-[13px]" : "text-[11px]",
                        ].join(" ")}
                        style={{ opacity: isAdminMobile || sidebarExpanded ? 1 : 0 }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="border-t border-border p-1">
            <button
              onClick={handleLogout}
              className={[
                "flex items-center gap-2.5 w-full border-none cursor-pointer text-left bg-transparent text-muted-foreground",
                isAdminMobile ? "px-4 py-3.5" : "px-4 py-2",
              ].join(" ")}
            >
              <LogOut size={16} className="flex-shrink-0" />
              <span
                className={[
                  "font-body whitespace-nowrap transition-opacity",
                  isAdminMobile ? "text-[13px]" : "text-[11px]",
                ].join(" ")}
                style={{ opacity: isAdminMobile || sidebarExpanded ? 1 : 0 }}
              >
                Sign out
              </span>
            </button>
          </div>
        </nav>

        {/* ── MAIN AREA ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {isSiteTab ? (
            // The builder renders as a fixed full-screen overlay (see
            // PageBuilderShell) with its own toolbar, navigator and
            // inspector; this shell's topbar/sidebar sit behind it.
            <div className="flex-1 overflow-hidden">
              {cmsPage
                ? <CmsPageBuilder pageId={cmsPage.id} onExit={handleExitBuilder} onDirtyChange={setBuilderDirty} onRegisterSave={registerBuilderSave} />
                : <SiteEditor onExit={handleExitBuilder} onDirtyChange={setBuilderDirty} onRegisterSave={registerBuilderSave} />}
            </div>
          ) : (
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-[1000px] mx-auto">
                {activeTab === "overview" && (
                  <AdminOverviewDashboard
                    onNavigate={(tab) => navigate(tabToPath(tab as Tab))}
                    onCreatePage={() => {
                      setPendingCreatePage(true);
                      navigate("/admin/pages");
                    }}
                  />
                )}
                {activeTab === "pages" && (
                  <PagesManager
                    onEditPage={handleEditPage}
                    autoOpenCreate={pendingCreatePage}
                    onAutoOpenConsumed={() => setPendingCreatePage(false)}
                  />
                )}
                {activeTab === "navigation" && <NavigationManager />}
                {activeTab === "blog" && <BlogEditor />}
                {activeTab === "contacts" && <ContactsList />}
                {activeTab === "emails" && <EmailCampaigns />}
                {activeTab === "media" && <MediaGallery />}
                {activeTab === "brand" && <BrandSettings />}
                {activeTab === "tags" && <TagsManager />}
                {activeTab === "redirects" && <RedirectsManager />}
                {activeTab === "team" && <ManageTeam />}
                {activeTab === "seo_master" && <SeoMaster />}
                {activeTab === "versions" && <VersionHistory />}
                {activeTab === "settings" && <GlobalSettings />}
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
