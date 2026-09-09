/**
 * AdminDashboard — the admin shell.
 *
 *   ┌────┬──────────────────────────────────────────────────────────┐
 *   │    │ TOPBAR  title · sub-tabs · preview live · profile         │
 *   │rail├──────────────────────────────────────────────────────────┤
 *   │    │ Main area: one destination (Pages, Blog, …) — or, on the  │
 *   │    │ builder routes, the full-screen page builder.             │
 *   └────┴──────────────────────────────────────────────────────────┘
 *
 * Nine destinations on a 44px icon rail (labels on hover). Everything
 * that used to be its own sidebar entry is a sub-tab now — see
 * navigation.ts, which also redirects the old URLs. Mobile (<768px)
 * turns the rail into an off-canvas drawer with labels.
 *
 * This file does not edit content. Every row edit goes through
 * PageBuilderShell → InspectorPanel; every save/publish through the
 * builder adapters (SiteEditor for Home, CmsPageBuilder for pages,
 * BlogPostBuilder for posts). The only editor state here is what the
 * in-app navigation guard needs (dirty flag + save function).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runDbAction } from "@/services/db-helpers";
import { useSiteContent } from "@/hooks/useSiteContent";
import { LogOut, X, Menu, Sun, Moon, ExternalLink } from "lucide-react";
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
import MediaGallery from "./MediaGallery";
import DesignScreen from "./DesignScreen";
import SeoMaster from "./SeoMaster";
import SearchEnginesSettings from "./SearchEnginesSettings";
import VersionHistory from "./VersionHistory";
import AdminInsights from "@/pages/AdminInsights";
import { confirmUnsavedExit } from "@/components/ConfirmDialog";
import SiteEditor from "./SiteEditor";
import CmsPageBuilder from "./builder/CmsPageBuilder";
import { ADMIN_DESTINATIONS, adminPath, resolveAdminTab, type AdminTab } from "./navigation";
import type { AdminTheme } from "@/hooks/useAdminTheme";

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

interface Props {
  session: unknown;
  theme?: AdminTheme;
  onToggleTheme?: () => void;
}

interface CmsPageRef { id: string; slug: string; title: string }

const AdminDashboard = ({ theme = "light", onToggleTheme }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ tab?: string; pageId?: string }>();
  const isAdminMobile = useIsAdminMobile();
  const branding = useSiteContent<Record<string, string | undefined>>("branding", {});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  /* ── Where are we? The URL is the single source of truth. ── */
  const isBuilderRoute = location.pathname === "/admin/site" || location.pathname.startsWith("/admin/site/");
  const segment = isBuilderRoute ? "pages" : location.pathname === "/admin" ? "overview" : params.tab;
  const resolved = resolveAdminTab(segment, location.search);
  const activeTab: AdminTab = resolved.tab;
  const activeSub = resolved.sub;
  useEffect(() => {
    if (resolved.redirect && !isBuilderRoute) navigate(resolved.redirect, { replace: true });
  }, [resolved.redirect, isBuilderRoute, navigate]);
  const destination = ADMIN_DESTINATIONS.find((d) => d.key === activeTab)!;

  /* ── CMS page being edited (for the builder title) ── */
  const [cmsPage, setCmsPage] = useState<CmsPageRef | null>(null);
  const urlPageId = isBuilderRoute ? params.pageId : undefined;
  useEffect(() => {
    if (!urlPageId) { setCmsPage((prev) => (prev ? null : prev)); return; }
    if (cmsPage?.id === urlPageId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("cms_pages").select("id, slug, title").eq("id", urlPageId).maybeSingle();
      if (!cancelled && data) setCmsPage(data as CmsPageRef);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPageId]);

  /* ── Unsaved-changes guard for in-app navigation ── */
  const [builderDirty, setBuilderDirty] = useState(false);
  const builderSaveRef = useRef<(() => Promise<boolean>) | null>(null);
  const registerBuilderSave = useCallback((fn: (() => Promise<boolean>) | null) => { builderSaveRef.current = fn; }, []);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => builderDirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    (async () => {
      const saver = builderSaveRef.current;
      const ok = await confirmUnsavedExit(saver ? () => saver() : undefined);
      if (ok) blocker.proceed(); else blocker.reset();
    })();
  }, [blocker]);

  const handleLogout = async () => {
    await runDbAction({ action: () => supabase.auth.signOut(), successMessage: "Logged out" });
  };

  const go = useCallback((tab: AdminTab, sub?: string) => {
    navigate(adminPath(tab, sub));
    setMobileDrawerOpen(false);
  }, [navigate]);

  /** Open a page in the builder. `null` = Home (site_content). */
  const openInBuilder = useCallback((page: CmsPageRef | null) => {
    if (!page) { navigate("/admin/site"); return; }
    setCmsPage(page);
    navigate(`/admin/site/pages/${page.id}`);
  }, [navigate]);

  const exitBuilder = useCallback(() => navigate("/admin/pages"), [navigate]);

  const previewHref = isBuilderRoute ? (cmsPage ? `/p/${cmsPage.slug}` : "/") : "/";
  const title = isBuilderRoute ? (cmsPage ? cmsPage.title : "Home") : destination.label;

  const railItem = (d: (typeof ADMIN_DESTINATIONS)[number]) => {
    const active = activeTab === d.key;
    return (
      <button
        key={d.key}
        type="button"
        onClick={() => go(d.key)}
        aria-current={active ? "page" : undefined}
        aria-label={d.label}
        className={`admin-rail-item${isAdminMobile ? " mobile" : ""}`}
      >
        <d.icon size={16} aria-hidden />
        <span className={isAdminMobile ? "admin-rail-label" : "admin-rail-tip"}>{d.label}</span>
      </button>
    );
  };
  const mainItems = ADMIN_DESTINATIONS.filter((d) => !d.bottom);
  const bottomItems = ADMIN_DESTINATIONS.filter((d) => d.bottom);

  return (
    <div className="h-screen flex admin-shell">
      {/* ═══ RAIL ═══ */}
      {isAdminMobile && mobileDrawerOpen && (
        <div onClick={() => setMobileDrawerOpen(false)} aria-hidden className="absolute inset-0 z-40" style={{ background: "hsl(var(--foreground) / 0.4)" }} />
      )}
      <nav
        aria-label="Admin"
        className={`admin-rail${isAdminMobile ? " mobile" : ""}${isAdminMobile && !mobileDrawerOpen ? " closed" : ""}`}
      >
        <a href="/" title="View site" aria-label="View site" className="admin-rail-logo">
          {(() => {
            /* Same rule as the site's emblem: the dark-theme mark at night, the light one by day. */
            const mark = theme === "dark" ? branding.favicon_dark || branding.favicon_light : branding.favicon_light || branding.favicon_dark;
            return mark ? <img src={mark} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} /> : "C";
          })()}
        </a>
        {isAdminMobile && (
          <button type="button" onClick={() => setMobileDrawerOpen(false)} aria-label="Close menu" className="admin-rail-item mobile"><X size={16} /><span className="admin-rail-label">Close</span></button>
        )}
        {mainItems.map(railItem)}
        <div className="flex-1" />
        {bottomItems.map(railItem)}
        {onToggleTheme && (
          <button type="button" onClick={onToggleTheme} className={`admin-rail-item${isAdminMobile ? " mobile" : ""}`} aria-label={theme === "dark" ? "Switch to day" : "Switch to night"}>
            {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
            <span className={isAdminMobile ? "admin-rail-label" : "admin-rail-tip"}>{theme === "dark" ? "Day" : "Night"}</span>
          </button>
        )}
        <button type="button" onClick={handleLogout} className={`admin-rail-item${isAdminMobile ? " mobile" : ""}`} aria-label="Sign out">
          <LogOut size={16} aria-hidden />
          <span className={isAdminMobile ? "admin-rail-label" : "admin-rail-tip"}>Sign out</span>
        </button>
      </nav>

      {/* ═══ MAIN COLUMN ═══ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {!isBuilderRoute && (
          <header className="admin-topbar">
            {isAdminMobile && (
              <button type="button" onClick={() => setMobileDrawerOpen(true)} aria-label="Open menu" className="admin-btn ghost icon"><Menu size={16} /></button>
            )}
            <h1 className="admin-title">{title}</h1>
            {destination.tabs && (
              <div className="admin-subtabs" role="tablist" aria-label={`${destination.label} sections`}>
                {destination.tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={activeSub === t.key}
                    onClick={() => go(destination.key, t.key)}
                    className="admin-subtab"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1" />
            <a href={previewHref} target="_blank" rel="noreferrer" className="admin-btn ghost" title="Open the live site in a new tab">
              <ExternalLink size={13} aria-hidden /> View site
            </a>
            <Link
              to="/admin/profile"
              title="Profile settings"
              className="w-7 h-7 rounded-full flex items-center justify-center font-display text-[10px] font-bold no-underline"
              style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
            >
              R
            </Link>
          </header>
        )}

        {isBuilderRoute ? (
          <div className="flex-1 overflow-hidden">
            {cmsPage
              ? <CmsPageBuilder pageId={cmsPage.id} onExit={exitBuilder} onDirtyChange={setBuilderDirty} onRegisterSave={registerBuilderSave} />
              : <SiteEditor onExit={exitBuilder} onDirtyChange={setBuilderDirty} onRegisterSave={registerBuilderSave} />}
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto admin-main">
            {activeTab === "overview" && <AdminOverviewDashboard onGo={go} onOpenInBuilder={openInBuilder} />}
            {activeTab === "pages" && <PagesManager onEditPage={openInBuilder} />}
            {activeTab === "blog" && (activeSub === "tags" ? <TagsManager /> : <BlogEditor />)}
            {activeTab === "media" && <MediaGallery />}
            {activeTab === "navigation" && <NavigationManager />}
            {activeTab === "design" && <DesignScreen />}
            {activeTab === "audience" && (activeSub === "campaigns" ? <EmailCampaigns /> : <ContactsList />)}
            {activeTab === "insights" && (activeSub === "seo" ? <SeoMaster /> : <AdminInsights embedded />)}
            {activeTab === "settings" && (
              activeSub === "team" ? <ManageTeam /> : activeSub === "history" ? <VersionHistory /> : activeSub === "search" ? <SearchEnginesSettings /> : <RedirectsManager />
            )}
          </main>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
