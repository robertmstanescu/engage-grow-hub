import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PageRows from "@/components/rows/PageRows";
import Footer from "@/components/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";

const Index = () => {
  const seo = useSiteContent<{ meta_title: string; meta_description: string }>("main_page_seo", { meta_title: "", meta_description: "" });

  usePageMeta({
    title: seo.meta_title || undefined,
    description: seo.meta_description || undefined,
  });

  return (
    <div className="min-h-screen lg:pl-16">
      <Navbar />
      <HeroSection />
      <PageRows />
      <Footer />
    </div>
  );
};

export default Index;
