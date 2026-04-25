import { useRef } from "react";
import Navbar from "@/features/site/Navbar";
import PageRows from "@/features/site/rows/PageRows";
import Footer from "@/features/site/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import { useThresholdSnap } from "@/hooks/useThresholdSnap";

/**
 * Index — the public homepage.
 *
 * ## Scroll-snap configuration
 *
 * The `.snap-container` wrapper is the scroll container. Native CSS
 * `scroll-snap-type` is disabled so we can implement a precise 51%
 * threshold rule via {@link useThresholdSnap}: scroll past 51% of the
 * current row and the page animates to the next row; below that, it
 * settles back. This gives the slide-deck feel without the violent
 * mid-scroll yank of `mandatory`.
 */
const Index = () => {
  const seo = useSiteContent<{ meta_title: string; meta_description: string }>("main_page_seo", { meta_title: "", meta_description: "" });
  const containerRef = useRef<HTMLDivElement>(null);

  usePageMeta({
    title: seo.meta_title || undefined,
    description: seo.meta_description || undefined,
  });

  useThresholdSnap(containerRef);

  return (
    <div ref={containerRef} className="snap-container lg:pl-16">
      <Navbar />
      <PageRows footerSlot={<Footer />} />
    </div>
  );
};

export default Index;
