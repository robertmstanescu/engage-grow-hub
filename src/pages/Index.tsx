import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import IntroStrip from "@/components/IntroStrip";
import ServicesPillar from "@/components/ServicesPillar";
import VowsSection from "@/components/VowsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const internalCommsServices = [
{
  tag: "Fixed project",
  tagType: "fixed" as const,
  title: "The Inspection",
  subtitle: "Internal Communications Audit",
  description:
  "Something is off. Messages are landing flat. Town halls feel like theatre. Employees know less about the company than the LinkedIn page does. The Inspection is where we lift the lid — assess what's working, what's dead, and what's actively draining your culture. You get a sharp, honest report and a prioritised action roadmap. No fluff. No \"synergy\".",
  deliverables: [
  "Stakeholder interviews across 3–5 levels of the organisation",
  "Full audit of your channels, cadence, tone and governance",
  "Identification of your top \"vampire moments\" — where comms is draining energy",
  "Written findings report (15–25 pages): clear, direct, no corporate fog",
  "Live presentation and Q&A walkthrough (90 minutes)",
  "Prioritised 30/60/90-day action roadmap"],

  price: "Book a free consultation",
  time: "2–3 weeks · ~15–20 hours",
  note: "The Inspection is the natural starting point for most clients — and it almost always reveals enough to warrant The Burial. Consider it an investment that pays for itself."
},
{
  tag: "Fixed project",
  tagType: "fixed" as const,
  title: "The Burial",
  subtitle: "Internal Communications Strategy & Playbook",
  description:
  "You know the problem. Now it's time to bury it properly and build something that lasts. The Burial is a full end-to-end Internal Comms transformation: we design your channel architecture, messaging framework, governance model and content calendar — then hand you a practical playbook your team can actually use on Monday morning.",
  deliverables: [
  "Extended discovery: cross-level stakeholder interviews + employee pulse survey",
  "Leadership communication style assessment",
  "Channel architecture design: what lives where, for whom, with what purpose",
  "Messaging framework and internal tone of voice guidelines",
  "Content calendar structure and governance model",
  "The Playbook: a practical, branded document covering the full system",
  "3–5 ready-to-use templates (all-hands agenda, newsletter format, announcement, manager cascade)",
  "Measurement framework: which metrics matter, how to track them, what good looks like",
  "Full leadership presentation + 90-minute team training session",
  "30-day post-delivery check-in call included"],

  price: "Book a free consultation",
  time: "5–7 weeks · ~40–50 hours"
},
{
  tag: "Monthly retainer",
  tagType: "retainer" as const,
  title: "The Resurrection",
  subtitle: "Fractional Internal Communications Lead",
  description:
  "You don't need a full-time Head of Internal Comms. You need the expertise of one, on demand, without the overhead. The Resurrection puts a senior comms partner in your corner every month — writing, advising, measuring and iterating alongside your People team.",
  deliverables: [
  "Monthly strategy session with your People or Comms lead",
  "Comms calendar planning and prioritisation",
  "Writing and editing: all-hands content, leadership messages, newsletters, announcements",
  "Crisis and sensitive comms advisory (restructures, cultural moments, leadership changes)",
  "Intranet content management and optimisation",
  "Engagement campaign ideation and execution",
  "Monthly metrics report with engagement data and recommendations"],

  deliverablesLabel: "What's inside (monthly)",
  price: "Book a free consultation",
  time: "Minimum 3-month commitment · ~14–20 hrs/mo",
  note: "The 3-month minimum isn't a lock-in for our benefit — it's a commitment to yours. Real cultural change doesn't happen in four weeks."
}];


const employeeExperienceServices = [
{
  tag: "Fixed project",
  tagType: "fixed" as const,
  title: "The Inspection",
  subtitle: "Employee Experience Audit",
  description:
  "Before you can fix the experience, you need to know where it's bleeding. We map the full employee lifecycle — from first impression to final goodbye — and identify the moments where energy, trust and engagement are being quietly drained.",
  deliverables: [
  "Interviews with employees across tenure: new joiners, mid-tenure, long-tenured",
  "Full lifecycle touchpoint review: attraction through offboarding",
  "Analysis of existing data: turnover patterns, exit themes, eNPS trends",
  "A one-page visual Employee Journey Map — a powerful standalone deliverable",
  "Identification of your top 3 vampire moments draining the experience",
  "Prioritised recommendations report with quick wins and longer-term fixes",
  "60-minute live presentation and Q&A"],

  price: "Book a free consultation",
  time: "2 weeks · ~14–18 hours"
},
{
  tag: "Fixed project",
  tagType: "fixed" as const,
  title: "The Burial",
  subtitle: "Onboarding Experience Design",
  description:
  "Bad onboarding is one of the most expensive things a company can do. New hires decide whether they've made the right choice within the first 90 days. We design the full journey from offer acceptance to settled, contributing team member.",
  deliverables: [
  "Discovery interviews: hiring managers, recent joiners, People team",
  "Audit of all existing onboarding materials",
  "Full journey design: defined outcomes at Day 1, Week 1, Month 1, Month 3",
  "Content architecture: what content, in what format, delivered how and by whom",
  "Buddy Programme design (structure, matching logic, guide materials)",
  "LMS course structure and content brief if applicable",
  "Manager onboarding guide: what good looks like at each stage",
  "Branded templates and materials (Canva/Adobe production included)",
  "Full handover session + 60-minute manager training"],

  price: "Book a free consultation",
  time: "4–6 weeks · ~35–45 hours"
},
{
  tag: "Fixed project",
  tagType: "fixed" as const,
  title: "The Burial",
  subtitle: "Engagement Survey Design & Action Planning",
  description:
  "Most companies buy a survey tool, send the survey, look at a number, and call it done. We design the survey, run it, analyse the results, and — most importantly — facilitate the action planning that turns a number into a movement.",
  deliverables: [
  "Survey design: question selection, scale choices, demographic cuts, eNPS architecture",
  "Full communications plan: pre-launch, during fieldwork, post-results",
  "Survey setup, testing and launch management",
  "Real-time participation monitoring with targeted nudge communications",
  "Full results analysis: scores, department cuts, demographic patterns, open text themes",
  "Visual results presentation for leadership — clear, honest, actionable",
  "2–3 hour results workshop with leadership: what do we actually do about this?",
  "90-day action plan with owners, timelines and success metrics"],

  price: "Book a free consultation",
  time: "4–5 weeks · ~25–30 hours"
},
{
  tag: "Monthly retainer",
  tagType: "retainer" as const,
  title: "The Resurrection",
  subtitle: "Fractional Employee Experience Partner",
  description:
  "Employee experience isn't a project. It's a practice. The Resurrection puts an experienced EX partner at your side every month — maintaining, iterating and improving the experiences that keep your people engaged, growing and staying.",
  deliverables: [
  "Monthly strategy session with your People lead",
  "Ongoing onboarding and offboarding process maintenance and improvement",
  "eNPS and pulse survey management, analysis and reporting",
  "ERG support, facilitation and content production",
  "Recognition programme management and iteration",
  "Ad hoc culture and engagement campaign design and execution"],

  deliverablesLabel: "What's inside (monthly)",
  price: "Book a free consultation",
  time: "Minimum 3-month commitment · ~10–14 hrs/mo"
}];


const Index = () => {
  return (
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <HeroSection />
      <IntroStrip />
      <div id="services">
        <ServicesPillar
          pillarNumber="Pillar 01"
          title="Internal Communications"
          description="Most internal comms is noise dressed up as signal. We help you cut through it — designing communication systems that actually reach people, move them, and mean something."
          services={internalCommsServices}
          bgClass="bg-card" />
        
        <ServicesPillar
          pillarNumber="Pillar 02"
          title="Employee Experience"
          description="The modern workplace is haunted by zombie journeys — onboarding processes that disappear after week one, surveys nobody acts on, and employees who feel invisible by month three."
          services={employeeExperienceServices}
          bgClass="bg-background" />
        
      </div>
      <VowsSection />
      <ContactSection />
      <Footer />
    </div>);

};

export default Index;