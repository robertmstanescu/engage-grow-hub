import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import { RowsRenderer } from "@/features/site/rows/PageRows";
import { rowsProvideHeading } from "@/features/site/rows/PrimaryHeadingContext";
import { normalizeRowsToV3 } from "@/lib/migrations/rowMigrations";
import type { PageRow } from "@/types/rows";
import NotFound from "./NotFound";
import usePageMeta from "@/hooks/usePageMeta";
import { readLivePreviewState, subscribeLivePreview } from "@/services/livePreview";

/* ════════════════════════════════════════════════════════════════════
 * CmsPage — public renderer for `cms_pages` records.
 *
 * US 2.2 — All row rendering now flows through the shared
 * `RowsRenderer` component (which normalizes any v1/v2 payload to v3 at
 * its entry point). This removes the parallel V1-only switch that used
 * to live here, leaving exactly ONE rendering engine for the entire
 * site (homepage, CMS pages, blog posts).
 * ──────────────────────────────────────────────────────────────────── */

const SYSTEM_ROUTES = ["blog", "admin", "unsubscribe", "api", "auth", "login", "signup", "p"];

/**
 * Public URL path for a CMS page slug — mirrors `cmsPagePath()` in
 * scripts/prerender-seo.mjs exactly (namespaced `services/...` slugs
 * live at the site root, everything else canonically lives under
 * `/p/`). CmsPage itself is
 * mounted at THREE route patterns (/services/:slug, /p/:slug, bare
 * /:slug) that can all resolve to the same row for a flat slug like
 * "about-us" — without a shared canonical target, each would
 * self-canonicalize to whatever URL happened to match, i.e. three
 * "canonical" URLs for one piece of content. This is what every route
 * passes to usePageMeta's `canonicalPath` so they all agree on one.
 */
const cmsPagePath = (slug: string): string =>
  slug === "services" || slug.startsWith("services/") ? `/${slug}/` : `/p/${slug}/`;

/**
 * `prefix` lets a nested route (e.g. `/services/:slug`) resolve against a
 * namespaced CMS slug such as `services/internal-communications`, while
 * the flat `/:slug` route keeps working unchanged.
 */
const CmsPage = ({ prefix = "" }: { prefix?: string }) => {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ? `${prefix}${params.slug}` : undefined;
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "draft";
  const [page, setPage] = useState<any>(null);
  const [livePreviewPage, setLivePreviewPage] = useState<{ rows: PageRow[]; meta_title?: string; meta_description?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isServicePage = Boolean(slug && (slug === "services" || slug.startsWith("services/")) && slug !== "services");

  usePageMeta({
    title: livePreviewPage?.meta_title || page?.meta_title || page?.title || undefined,
    description: livePreviewPage?.meta_description || page?.meta_description || undefined,
    canonicalPath: slug ? cmsPagePath(slug) : undefined,
    serviceSchema:
      isServicePage && page?.title
        ? { name: page.title, description: page?.meta_description || undefined }
        : undefined,
  });

  useEffect(() => {
    if (!slug || !isPreview) { setLivePreviewPage(null); return; }

    const syncPreview = (state = readLivePreviewState()) => {
      const draft = state.cmsPages[slug];
      setLivePreviewPage(draft ? { rows: draft.rows || [], meta_title: draft.meta_title, meta_description: draft.meta_description } : null);
    };

    syncPreview();
    return subscribeLivePreview(syncPreview);
  }, [slug, isPreview]);

  useEffect(() => {
    if (!slug || SYSTEM_ROUTES.includes(slug)) { setNotFound(true); setLoading(false); return; }
    const load = async () => {
      // `draft_page_rows` is only readable by signed-in admins (anon column
      // access is revoked), so we only ask for it in preview mode.
      const columns = [
        "id", "slug", "title", "template_type", "page_rows", "status",
        "meta_title", "meta_description", "og_image", "ai_summary",
        "created_at", "updated_at",
      ].concat(isPreview ? ["draft_page_rows"] : []).join(", ");
      const { data, error } = await supabase.from("cms_pages").select(columns).eq("slug", slug).maybeSingle();
      if (!data || error) setNotFound(true); else setPage(data as any);
      setLoading(false);
    };
    load();
  }, [slug, isPreview]);


  if (loading) {
    return (
      <div className="min-h-screen page-shell flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="animate-pulse font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</div>
      </div>
    );
  }

  if (notFound) return <NotFound />;

  const rows: PageRow[] = livePreviewPage?.rows || (isPreview && page?.draft_page_rows ? page.draft_page_rows : (page?.page_rows || []));

  const pageTitle: string = page?.title || livePreviewPage?.meta_title || "";

  return (
    <CmsPageBody rows={rows} isPreview={isPreview} pageTitle={pageTitle} />
  );
};

const CmsPageBody = ({ rows, isPreview, pageTitle }: { rows: PageRow[]; isPreview: boolean; pageTitle: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  /* Content-only pages (a privacy policy is the classic case) carry no
     titled widget, so nothing can be promoted to <h1>. Print the page
     title as a visually-hidden heading so the document is never
     headless for crawlers and screen readers. */
  const needsFallbackHeading =
    Boolean(pageTitle) && !rowsProvideHeading(normalizeRowsToV3(rows) as any);
  return (
    <div ref={containerRef} className="snap-container page-shell">
      <Navbar />
      {isPreview && (
        <div className="sticky top-0 z-50 px-4 py-2 text-center font-body text-xs uppercase tracking-wider"
          style={{ backgroundColor: "hsl(46 75% 60%)", color: "hsl(260 20% 10%)" }}>
          Draft Preview — This page is not published yet
        </div>
      )}
      {needsFallbackHeading && <h1 className="sr-only">{pageTitle}</h1>}
      <div>
        {rows.length === 0 ? (
          <>
            <div className="py-32 text-center font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              This page has no content yet. Add rows in the admin panel.
            </div>
            <Footer />
          </>
        ) : (
          <RowsRenderer rows={rows} footerSlot={<Footer />} />
        )}
      </div>
    </div>
  );
};

export default CmsPage;
