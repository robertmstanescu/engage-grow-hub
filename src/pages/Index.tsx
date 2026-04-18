import Navbar from "@/features/site/Navbar";
import HeroSection from "@/features/site/HeroSection";
import PageRows from "@/features/site/rows/PageRows";
import Footer from "@/features/site/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";

/**
 * Index — the public homepage.
 *
 * ## Scroll-snap configuration (the "hard snap" / slide-deck feel)
 *
 * The `.snap-container` wrapper sets `scroll-snap-type: y mandatory`
 * (defined in src/index.css). Each row inside `<PageRows/>` carries
 * `scroll-snap-align: start` via the `.snap-section` class.
 *
 * Why `mandatory` (slide-deck) instead of `proximity` (soft)?
 *   - The brand wants each row treated as a discrete "slide" — you
 *     either see THIS row or the NEXT row, never half-and-half.
 *   - `mandatory` enforces that lock. Every scroll gesture lands on a
 *     snap point. No mid-content stranding.
 *   - `proximity` only snaps when you happen to land near a row, which
 *     is more ambiguous and less intentional.
 *
 * The trade-off (small wheel ticks jump a full screen) is mitigated by
 * ADAPTIVE PADDING (`py-row-fluid`, see tailwind.config.ts) and
 * AGGRESSIVE FLUID TYPOGRAPHY (clamp with vh+vw, vh-weighted — see
 * typography/RowBody.tsx) so every row's content fits inside one
 * viewport without scrolling, even on a 13" laptop.
 */
const Index = () => {
  const seo = useSiteContent<{ meta_title: string; meta_description: string }>("main_page_seo", { meta_title: "", meta_description: "" });

  usePageMeta({
    title: seo.meta_title || undefined,
    description: seo.meta_description || undefined,
  });

  return (
    <div className="snap-container lg:pl-16">
      <Navbar />
      <HeroSection />
      <PageRows footerSlot={<Footer />} />
    </div>
  );
};

export default Index;
