import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import IntroStrip from "@/components/IntroStrip";
import ServicesPillar from "@/components/ServicesPillar";
import VowsSection from "@/components/VowsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";

interface PillarContent {
  pillar_number: string;
  title: string;
  description: string;
}

interface ServiceItem {
  tag: string;
  tagType: "fixed" | "retainer";
  title: string;
  subtitle: string;
  description: string;
  deliverables: string[];
  deliverablesLabel?: string;
  price: string;
  time: string;
  note?: string;
}

const defaultCommsServices: ServiceItem[] = [
  {
    tag: "Fixed project", tagType: "fixed", title: "The Inspection", subtitle: "Internal Communications Audit",
    description: "Something is off. Messages are landing flat. Town halls feel like theatre.",
    deliverables: ["Stakeholder interviews", "Full audit", "Written findings report", "Action roadmap"],
    price: "Book a free consultation", time: "2–3 weeks · ~15–20 hours",
  },
];

const defaultExServices: ServiceItem[] = [
  {
    tag: "Fixed project", tagType: "fixed", title: "The Inspection", subtitle: "Employee Experience Audit",
    description: "Before you can fix the experience, you need to know where it's bleeding.",
    deliverables: ["Employee interviews", "Lifecycle review", "Journey Map", "Recommendations report"],
    price: "Book a free consultation", time: "2 weeks · ~14–18 hours",
  },
];

const Index = () => {
  const commsContent = useSiteContent<PillarContent>("pillar_comms", {
    pillar_number: "Pillar 01",
    title: "Internal Communications",
    description: "Most internal comms is noise dressed up as signal.",
  });

  const exContent = useSiteContent<PillarContent>("pillar_ex", {
    pillar_number: "Pillar 02",
    title: "Employee Experience",
    description: "The modern workplace is haunted by zombie journeys.",
  });

  const commsServices = useSiteContent<{ services: ServiceItem[] }>("services_comms", { services: defaultCommsServices });
  const exServices = useSiteContent<{ services: ServiceItem[] }>("services_ex", { services: defaultExServices });

  return (
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <HeroSection />
      <IntroStrip />
      <div id="services">
        <ServicesPillar
          id="internal-comms"
          colorScope="pillar-comms"
          pillarNumber={commsContent.pillar_number}
          title={commsContent.title}
          description={commsContent.description}
          services={commsServices.services}
        />
        <ServicesPillar
          id="employee-experience"
          colorScope="pillar-ex"
          pillarNumber={exContent.pillar_number}
          title={exContent.title}
          description={exContent.description}
          services={exServices.services}
        />
      </div>
      <VowsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
