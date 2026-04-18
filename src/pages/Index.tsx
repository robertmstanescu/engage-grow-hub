import Navbar from "@/features/site/Navbar";
import HeroSection from "@/features/site/HeroSection";
import PageRows from "@/features/site/rows/PageRows";
import Footer from "@/features/site/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";

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
