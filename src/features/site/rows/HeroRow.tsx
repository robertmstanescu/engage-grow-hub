import type { PageRow } from "@/types/rows";
import { getRowBgColor } from "./rowBackground";
import { resolveRowMinHeight } from "@/lib/rowHeight";
import { HeroView } from "@/features/site/HeroSection";
import Icon from "@/features/icons/Icon";

interface Props {
  row: PageRow;
}

/**
 * <HeroRow/> — the CMS "Hero" row.
 *
 * It renders the SAME view as the homepage hero (`<HeroView/>`) so every
 * page's hero shares one layout, type scale and entrance animation.
 * Inline editing is disabled here: a CMS row's copy is edited in the page
 * builder, not through the site_content "hero" section.
 */
const HeroRow = ({ row }: Props) => {
  const c = row.content || {};
  const minHeight = resolveRowMinHeight(row.layout);
  /* HeroView fills the viewport by default (the homepage opener). A CMS
   * hero whose admin picked Height ▸ Auto hugs its content instead, so
   * the row after it can stack straight under the title rather than
   * under half a screen of empty band. Unset (older rows) stays full. */
  const hugsContent = row.layout?.heightMode === "auto";

  return (
    <HeroView
      editable={false}
      content={c as any}
      sectionStyle={{
        backgroundColor: getRowBgColor(row),
        ...(hugsContent ? { minHeight: 0 } : minHeight ? { minHeight } : null),
      }}
      leading={
        c.icon ? (
          <div style={{ color: "hsl(var(--hero-title))" }}>
            <Icon value={c.icon} size={48} />
          </div>
        ) : null
      }
      trailing={
        c.cta_url && c.cta_label ? (
          <a
            href={c.cta_url}
            target={c.cta_url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="btn-ink"
          >
            {c.cta_label}
          </a>
        ) : null
      }
    />
  );
};

export default HeroRow;
