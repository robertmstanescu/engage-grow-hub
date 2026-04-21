import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/services/sanitize";

const fallback = { text: "" };

const IntroStrip = () => {
  const { isLoading, content: c } = useSiteContentWithStatus<{ text: string }>("intro", fallback);
  if (isLoading || !c.text) {
    return <div data-section="intro" aria-busy={isLoading} className="snap-section section-light relative py-24 md:py-32 px-3" />;
  }

  return (
    <div data-section="intro" className="snap-section section-light relative py-24 md:py-32 px-3">
      <div className="absolute inset-0 opacity-30 blur-[100px]" style={{ background: "radial-gradient(ellipse 80% 60% at 30% 70%, hsl(280 55% 24% / 0.2), transparent), radial-gradient(ellipse 60% 40% at 70% 30%, hsl(286 42% 30% / 0.15), transparent)" }} />

      <div className="relative z-10 max-w-[700px] mr-auto ml-0 text-left">
        <div className="text-5xl mb-8" style={{ color: "hsl(var(--primary))", opacity: 0.15 }}>✦</div>
        <p
          className="font-body-heading text-lg md:text-xl font-medium leading-relaxed"
          style={{ color: "hsl(var(--light-fg) / 0.85)" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.text) }}
        />
      </div>
    </div>
  );
};

export default IntroStrip;
