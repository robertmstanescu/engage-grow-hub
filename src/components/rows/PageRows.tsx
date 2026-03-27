import { useSiteContent } from "@/hooks/useSiteContent";
import { DEFAULT_ROWS, type PageRow } from "@/types/rows";
import TextRow from "./TextRow";
import ServiceRow from "./ServiceRow";
import BoxedRow from "./BoxedRow";
import ContactRow from "./ContactRow";
import HeroRow from "./HeroRow";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type Alignment = "left" | "right" | "center";

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
      if (!prevWasPillar) prePillar = current;
      alignments.push("left");
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
  const wrapper = (children: React.ReactNode) => (
    <div id={id} style={{ scrollMarginTop: "4rem" }}>{children}</div>
  );

  switch (row.type) {
    case "hero":
      return wrapper(<HeroRow row={row} />);
    case "text":
      return wrapper(<TextRow row={row} rowIndex={rowIndex} align={align} />);
    case "service":
      return wrapper(<ServiceRow row={row} rowIndex={rowIndex} align={align} />);
    case "boxed":
      return wrapper(<BoxedRow row={row} rowIndex={rowIndex} align={align} />);
    case "contact":
      return wrapper(<ContactRow row={row} align={align} />);
    default:
      return null;
  }
};

const PageRows = () => {
  const data = useSiteContent<{ rows: PageRow[] }>("page_rows", { rows: DEFAULT_ROWS });
  const rows = data.rows || [];
  const autoAlignments = computeAutoAlignments(rows);

  return (
    <>
      {rows.map((row, index) => (
        <RowRenderer key={row.id} row={row} rowIndex={index} align={resolveAlignment(row, autoAlignments[index])} />
      ))}
    </>
  );
};

export default PageRows;
