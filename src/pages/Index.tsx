import { useEffect, useRef } from "react";
import Navbar from "@/features/site/Navbar";
import PageRows from "@/features/site/rows/PageRows";
import Footer from "@/features/site/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import { useSmoothAnchors } from "@/hooks/useSmoothAnchors";
import { extractFaqItems } from "@/features/site/rows/PrimaryHeadingContext";
import { normalizeRowsToV3 } from "@/lib/migrations/rowMigrations";
import type { PageRow } from "@/types/rows";

/**
 * Index — the public homepage.
 *
 * Scrolling is plain and uninterrupted: no snapping, no momentum
 * hijacking. The only assisted movement is the smooth glide applied to
 * in-page anchor clicks (see {@link useSmoothAnchors}).
 */

const Index = () => {
  const seo = useSiteContent<{ meta_title: string; meta_description: string }>("main_page_seo", { meta_title: "", meta_description: "" });
  const pageRowsData = useSiteContent<{ rows: PageRow[] }>("page_rows", { rows: [] });
  const containerRef = useRef<HTMLDivElement>(null);

  const faqItems = extractFaqItems(normalizeRowsToV3(pageRowsData.rows || []) as any);

  usePageMeta({
    title: seo.meta_title || undefined,
    description: seo.meta_description || undefined,
    faqSchema: faqItems.length > 0 ? faqItems : undefined,
  });

  // Slow, fluid glide for in-page anchor link clicks (Navbar items,
  // service-card "→" CTAs, footer links). Cancellable mid-flight by
  // any user wheel/touch gesture so it never traps the reader.
  useSmoothAnchors(containerRef);

  /* Landing on `/#some-row` from another page (footer / nav links on
     the blog, for example): rows load asynchronously, so the browser's
     native hash jump fires before the target exists — and it targets
     the window, not our custom scroll container. Poll briefly for the
     element and scroll the container to it ourselves. */
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const container = containerRef.current;
      const target = document.getElementById(hash);
      if (container && target) {
        window.clearInterval(timer);
        const top =
          target.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop;
        container.scrollTo({ top, behavior: "smooth" });
      } else if (++tries > 40) {
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div ref={containerRef} className="snap-container page-shell">
      <Navbar />
      <PageRows footerSlot={<Footer />} />
    </div>
  );
};

export default Index;

