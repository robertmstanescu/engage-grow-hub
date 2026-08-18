import { useRef } from "react";
import Navbar from "@/features/site/Navbar";
import PageRows from "@/features/site/rows/PageRows";
import Footer from "@/features/site/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import { useSmoothAnchors } from "@/hooks/useSmoothAnchors";

/**
 * Index — the public homepage.
 *
 * Scrolling is plain and uninterrupted: no snapping, no momentum
 * hijacking. The only assisted movement is the smooth glide applied to
 * in-page anchor clicks (see {@link useSmoothAnchors}).
 */

const Index = () => {
  const seo = useSiteContent<{ meta_title: string; meta_description: string }>("main_page_seo", { meta_title: "", meta_description: "" });
  const containerRef = useRef<HTMLDivElement>(null);

  usePageMeta({
    title: seo.meta_title || undefined,
    description: seo.meta_description || undefined,
  });

  // Slow, fluid glide for in-page anchor link clicks (Navbar items,
  // service-card "→" CTAs, footer links). Cancellable mid-flight by
  // any user wheel/touch gesture so it never traps the reader.
  useSmoothAnchors(containerRef);

  return (
    <div ref={containerRef} className="snap-container page-shell">
      <Navbar />
      <PageRows footerSlot={<Footer />} />
    </div>
  );
};

export default Index;
