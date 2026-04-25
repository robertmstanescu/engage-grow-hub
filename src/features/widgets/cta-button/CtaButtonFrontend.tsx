/**
 * CtaButtonFrontend — public renderer for the standalone CTA widget.
 *
 * Visual contract matches the inline `cta_label` / `cta_url` button
 * shared by every legacy row (TextRow, HeroRow, GridRow, …): a
 * pill-shaped glass button using `--secondary` as the surface and
 * `--primary-foreground` as the label colour. Keeping the markup
 * identical means brand styling tweaks propagate everywhere.
 */
import type { PageRow } from "@/types/rows";

interface CtaButtonFrontendProps {
  row: PageRow;
  align?: "left" | "center" | "right";
}

const CtaButtonFrontend = ({ row, align: outerAlign }: CtaButtonFrontendProps) => {
  const c = (row.content || {}) as {
    cta_label?: string;
    cta_url?: string;
    align?: "left" | "center" | "right";
  };
  const label = (c.cta_label || "").trim();
  const url = (c.cta_url || "").trim();
  if (!label || !url) return null;

  const align = c.align ?? outerAlign ?? "center";
  const wrapperJustify =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  const isExternal = url.startsWith("http");

  return (
    <div className="w-full flex" style={{ justifyContent: wrapperJustify }}>
      <a
        href={url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full inline-block"
        style={{
          backgroundColor: "hsl(var(--secondary))",
          color: "hsl(var(--primary-foreground))",
        }}
      >
        {label}
      </a>
    </div>
  );
};

export default CtaButtonFrontend;
