import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useThresholdSnap } from "@/hooks/useThresholdSnap";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import { RowsRenderer } from "@/features/site/rows/PageRows";
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

const CmsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "draft";
  const [page, setPage] = useState<any>(null);
  const [livePreviewPage, setLivePreviewPage] = useState<{ rows: PageRow[]; meta_title?: string; meta_description?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageMeta({
    title: livePreviewPage?.meta_title || page?.meta_title || page?.title || undefined,
    description: livePreviewPage?.meta_description || page?.meta_description || undefined,
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
      const { data, error } = await supabase.from("cms_pages").select("*").eq("slug", slug).maybeSingle();
      if (!data || error) setNotFound(true); else setPage(data);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen lg:pl-16 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="animate-pulse font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</div>
      </div>
    );
  }

  if (notFound) return <NotFound />;

  const rows: PageRow[] = livePreviewPage?.rows || (isPreview && page?.draft_page_rows ? page.draft_page_rows : (page?.page_rows || []));

  return (
    <div className="snap-container lg:pl-16">
      <Navbar />
      {isPreview && (
        <div className="sticky top-0 z-50 px-4 py-2 text-center font-body text-xs uppercase tracking-wider"
          style={{ backgroundColor: "hsl(46 75% 60%)", color: "hsl(260 20% 10%)" }}>
          Draft Preview — This page is not published yet
        </div>
      )}
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
