import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PageRows from "@/components/rows/PageRows";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <HeroSection />
      <PageRows />
      <Footer />
    </div>
  );
};

export default Index;
