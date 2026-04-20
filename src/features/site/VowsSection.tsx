import { useSiteContentWithStatus } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/services/sanitize";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

interface VowsContent {
  title_line1?: string;
  title_line2?: string;
  title_lines?: any[];
  cards: { title: string; body: string }[];
  color_title?: string;
  color_card_title?: string;
  color_card_body?: string;
}

const fallback: VowsContent = { title_lines: [], cards: [] };

const VowsSection = () => {
  const { isLoading, content: c } = useSiteContentWithStatus<VowsContent>("vows", fallback);
  const { ref, isVisible } = useScrollReveal();

  if (isLoading) {
    return (
      <section
        id="vows"
        data-section="vows"
        aria-busy="true"
        className="snap-section grain relative py-32 md:py-40"
        style={{ backgroundColor: "hsl(var(--vows-bg))", isolation: "isolate", paddingTop: "24px", paddingBottom: "24px" }}
      />
    );
  }

  const titleLines: string[] = (c.title_lines || [c.title_line1 || "", c.title_line2 || ""]).map(
    (l: any) => (typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`)
  );

  return (
    <section id="vows" data-section="vows" className="snap-section grain relative py-32 md:py-40" style={{ backgroundColor: "hsl(var(--vows-bg))", isolation: "isolate", paddingTop: "24px", paddingBottom: "24px" }}>
      <div className="absolute inset-0 opacity-60" style={{
        background: "radial-gradient(ellipse 80% 60% at 10% 90%, hsl(280 55% 18% / 0.6), transparent), radial-gradient(ellipse 60% 50% at 80% 20%, hsl(286 42% 20% / 0.4), transparent), radial-gradient(ellipse 50% 40% at 50% 50%, hsl(46 75% 60% / 0.04), transparent)"
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-[150px]"
        style={{ background: "radial-gradient(circle, hsl(46 75% 60%), transparent)" }} />

      <div ref={ref} className="relative z-10 max-w-[900px] mr-auto ml-0 px-3 text-left">
        {/*
          Title sizing is controlled INLINE per-line via the TitleLineEditor
          (each <span style="font-size: NNpx">…</span> wins). We deliberately
          do NOT set a Tailwind text-* class on this <h3>, otherwise the
          parent class would override the per-line pixel sizes the admin
          picked. A modest fluid baseline keeps untouched text legible.
        */}
        <h3
          className="font-display font-bold leading-tight mb-16"
          style={{ ...revealStyle(isVisible, 0), color: c.color_title || "hsl(var(--vows-title))", fontSize: "clamp(1.5rem, 1.5vh + 1.4vw, 3rem)" }}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
            </span>
          ))}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {c.cards.map((vow, i) => (
            <div
              key={i}
              className="rounded-xl p-7 text-left"
              style={{
                ...revealStyle(isVisible, i + 1),
                backgroundColor: "hsl(260 25% 12% / 0.5)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid hsl(280 20% 25% / 0.35)",
                boxShadow: "0 8px 40px -10px hsl(280 55% 15% / 0.4)",
              }}>
              <p className="font-body-heading font-bold mb-3" style={{ color: c.color_card_title || "hsl(var(--vows-card-title))", fontSize: "clamp(0.85rem, 0.4vh + 0.45vw, 1rem)" }}>{vow.title}</p>
              {/*
                Body has NO Tailwind text-* class — the RTE writes inline
                <span style="font-size: NNpx"> for every selection the admin
                styled. A parent text-xs would override those spans (the
                bug the user reported: "20px in editor, still tiny on site").
                The inline `font-size` here only acts as a fallback for
                un-styled paragraphs.
              */}
              <div className="font-body leading-relaxed" style={{ color: c.color_card_body || "hsl(var(--vows-card-body))", overflow: "visible", height: "auto", fontSize: "clamp(0.78rem, 0.4vh + 0.4vw, 0.95rem)" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(vow.body) }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VowsSection;
