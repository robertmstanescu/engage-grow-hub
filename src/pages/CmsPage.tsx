import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import TextRow from "@/features/site/rows/TextRow";
import ServiceRow from "@/features/site/rows/ServiceRow";
import BoxedRow from "@/features/site/rows/BoxedRow";
import ContactRow from "@/features/site/rows/ContactRow";
import HeroRow from "@/features/site/rows/HeroRow";
import ImageTextRow from "@/features/site/rows/ImageTextRow";
import ProfileRow from "@/features/site/rows/ProfileRow";
import GridRow from "@/features/site/rows/GridRow";
import type { PageRow } from "@/types/rows";
import type { Alignment, VAlign } from "@/features/site/rows/PageRows";
import NotFound from "./NotFound";
import usePageMeta from "@/hooks/usePageMeta";
import { readLivePreviewState, subscribeLivePreview } from "@/services/livePreview";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const resolveAlignment = (row: PageRow): Alignment => {
  const explicit = row.layout?.alignment;
  if (explicit && explicit !== "auto") return explicit;
  return "left";
};

const resolveVAlign = (row: PageRow): VAlign => row.layout?.verticalAlign || "middle";

/**
 * RowRenderer wraps each row in its own try/catch. The outer ErrorBoundary
 * inside <PageRows/> handles the homepage; on CMS pages we render rows
 * directly so we keep the same try/catch fallback here.
 *
 * If you change this list, also update PageRows.tsx so both renderers
 * stay in sync.
 */
const RowRenderer = ({ row, rowIndex }: { row: PageRow; rowIndex: number }) => {
  try {
    if (!row || !row.type) return null;
    const id = row.scope || slugify(row.strip_title || "section");
    const align = resolveAlignment(row);
    const vAlign = resolveVAlign(row);
    const wrapper = (children: React.ReactNode) => (<div id={id} style={{ scrollMarginTop: "4rem" }}>{children}</div>);
    switch (row.type) {
      case "hero": return wrapper(<HeroRow row={row} />);
      case "text": return wrapper(<TextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
      case "service": return wrapper(<ServiceRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
      case "boxed": return wrapper(<BoxedRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
      case "contact": return wrapper(<ContactRow row={row} align={align} vAlign={vAlign} />);
      case "image_text": return wrapper(<ImageTextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
      case "profile": return wrapper(<ProfileRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
      case "grid": return wrapper(<GridRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
      default: return null;
    }
  } catch { return <div className="py-8 text-center font-body text-sm text-destructive">Row render error</div>; }
};

const SYSTEM_ROUTES = ["blog", "admin", "unsubscribe", "api", "auth", "login", "signup", "p"];

const CmsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "draft";
  const [page, setPage] = useState<any>(null);
  const [livePreviewPage, setLivePreviewPage] = useState<{ rows: PageRow[]; meta_title?: string; meta_description?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageMeta({ title: livePreviewPage?.meta_title || page?.meta_title || page?.title || undefined, description: livePreviewPage?.meta_description || page?.meta_description || undefined });

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
          rows.map((row, index) => index === rows.length - 1 ? (
            <div key={row.id} className="snap-section">
              <RowRenderer row={row} rowIndex={index} />
              <Footer />
            </div>
          ) : <RowRenderer key={row.id} row={row} rowIndex={index} />)
        )}
      </div>
    </div>
  );
};

export default CmsPage;
