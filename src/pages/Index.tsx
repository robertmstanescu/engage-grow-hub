import Navbar from "@/features/site/Navbar";
import HeroSection from "@/features/site/HeroSection";
import PageRows from "@/features/site/rows/PageRows";
import Footer from "@/features/site/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";

/**
 * Index — the public homepage.
 *
 * ## Scroll-snap configuration (the "soft snap")
 *
 * The `.snap-container` wrapper sets `scroll-snap-type: y proximity`
 * (defined in src/index.css). Each row inside `<PageRows/>` carries
 * `scroll-snap-align: start` via the `.snap-section` class.
 *
 * Why `proximity` instead of `mandatory`?
 *   - `mandatory` forces the viewport to lock onto the nearest snap
 *     point on EVERY scroll event. It overrides momentum, cancels small
 *     wheel ticks, and feels rigid — users say it "fights" them.
 *   - `proximity` only snaps when the user lands NEAR a snap point on
 *     their own. Mid-scroll motion is preserved; the page magnetically
 *     "settles" at the next row instead of yanking to it. This is the
 *     premium / Apple-style soft feel the brand was designed around.
 *
 * Combined with fluid typography (`vh + vw` in clamp — see
 * typography/RowBody.tsx) every row's collapsed content fits inside one
 * viewport without hard-clipping, so the snap stays clean.
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
