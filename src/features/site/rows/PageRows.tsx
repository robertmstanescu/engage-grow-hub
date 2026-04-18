import { useSiteContent } from "@/hooks/useSiteContent";
import { DEFAULT_ROWS, type PageRow } from "@/types/rows";
import TextRow from "./TextRow";
import ServiceRow from "./ServiceRow";
import BoxedRow from "./BoxedRow";
import ContactRow from "./ContactRow";
import HeroRow from "./HeroRow";
import ImageTextRow from "./ImageTextRow";
import ProfileRow from "./ProfileRow";
import GridRow from "./GridRow";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type Alignment = "left" | "right" | "center";
export type VAlign = "top" | "middle" | "bottom";

/**
 * Calculate alternating alignment per row (auto mode).
 * - Service (pillar) rows are always "left".
 * - After a group of pillar rows, resume with the opposite of the pre-pillar alignment.
 * - All other rows alternate left/right.
 */
const computeAutoAlignments = (rows: PageRow[]): Alignment[] => {
  const alignments: Alignment[] = [];
  let current: Alignment = "left";
  let prePillar: Alignment | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isPillar = row.type === "service";
    const prevWasPillar = i > 0 && rows[i - 1].type === "service";

    if (isPillar) {
      // Service rows default to "center" in auto mode
      if (!prevWasPillar) prePillar = current;
      alignments.push("center");
    } else {
      if (prevWasPillar && prePillar !== null) {
        current = prePillar === "left" ? "right" : "left";
        prePillar = null;
      }
      alignments.push(current);
      current = current === "left" ? "right" : "left";
    }
  }
  return alignments;
};

const resolveAlignment = (row: PageRow, autoAlign: Alignment): Alignment => {
  const explicit = row.layout?.alignment;
  if (explicit && explicit !== "auto") return explicit;
  return autoAlign;
};

const RowRenderer = ({ row, rowIndex, align }: { row: PageRow; rowIndex: number; align: Alignment }) => {
  const id = row.scope || slugify(row.strip_title);
  const isService = row.type === "service";
  const vAlign: VAlign = row.layout?.verticalAlign || "middle";
  const wrapper = (children: React.ReactNode) => (
    <div id={id} style={{ scrollMarginTop: isService ? "0px" : "4rem", isolation: "isolate" }}>{children}</div>
  );

  switch (row.type) {
    case "hero":
      return wrapper(<HeroRow row={row} />);
    case "text":
      return wrapper(<TextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
    case "service":
      return wrapper(<ServiceRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
    case "boxed":
      return wrapper(<BoxedRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
    case "contact":
      return wrapper(<ContactRow row={row} align={align} vAlign={vAlign} />);
    case "image_text":
      return wrapper(<ImageTextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
    case "profile":
      return wrapper(<ProfileRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
    case "grid":
      return wrapper(<GridRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />);
    default:
      return null;
  }
};

const PageRows = ({ footerSlot }: { footerSlot?: React.ReactNode }) => {
  const data = useSiteContent<{ rows: PageRow[] }>("page_rows", { rows: DEFAULT_ROWS });
  const rows = data.rows || [];
  const autoAlignments = computeAutoAlignments(rows);
  const lastIndex = rows.length - 1;

  return (
    <>
      {rows.map((row, index) => {
        const rendered = (
          <RowRenderer key={row.id} row={row} rowIndex={index} align={resolveAlignment(row, autoAlignments[index])} />
        );
        // Group the last row with the footer in one snap section
        if (index === lastIndex && footerSlot) {
          return (
            <div key={row.id} className="snap-section">
              {rendered}
              {footerSlot}
            </div>
          );
        }
        return rendered;
      })}
      {/* Fallback if no rows */}
      {rows.length === 0 && footerSlot}
    </>
  );
};

export default PageRows;
