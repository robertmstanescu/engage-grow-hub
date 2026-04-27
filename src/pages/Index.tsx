import { useRef } from "react";
import Navbar from "@/features/site/Navbar";
import PageRows from "@/features/site/rows/PageRows";
import Footer from "@/features/site/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import { useMomentumSnap } from "@/hooks/useMomentumSnap";
import { useSmoothAnchors } from "@/hooks/useSmoothAnchors";

/**
 * Index — the public homepage.
 *
 * ## Scroll-snap configuration
 *
 * The `.snap-container` wrapper is the scroll container. Native CSS
 * `scroll-snap-type` is disabled so we can implement a precise 51%
 * threshold rule via {@link useMomentumSnap}: after the user finishes
 * scrolling, the page glides to the section that matches their scroll
 * direction over up to 1.5s. The footer below the last row stays
 * freely accessible.
 */
const Index = () => {
  const seo = useSiteContent<{ meta_title: string; meta_description: string }>("main_page_seo", { meta_title: "", meta_description: "" });
  const containerRef = useRef<HTMLDivElement>(null);

  usePageMeta({
    title: seo.meta_title || undefined,
    description: seo.meta_description || undefined,
  });

  useMomentumSnap(containerRef);


  return (
    <div ref={containerRef} className="snap-container page-shell">
      <Navbar />
      <PageRows footerSlot={<Footer />} />
    </div>
  );
};

export default Index;
