import { useSiteContent } from "@/hooks/useSiteContent";
import { DEFAULT_ROWS, type PageRow } from "@/types/rows";
import TextRow from "./TextRow";
import ServiceRow from "./ServiceRow";
import BoxedRow from "./BoxedRow";
import ContactRow from "./ContactRow";
import HeroRow from "./HeroRow";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RowRenderer = ({ row, rowIndex }: { row: PageRow; rowIndex: number }) => {
  const id = row.scope || slugify(row.strip_title);
  const wrapper = (children: React.ReactNode) => (
    <div id={id} style={{ scrollMarginTop: "4rem" }}>{children}</div>
  );

  switch (row.type) {
    case "hero":
      return wrapper(<HeroRow row={row} />);
    case "text":
      return wrapper(<TextRow row={row} rowIndex={rowIndex} />);
    case "service":
      return wrapper(<ServiceRow row={row} rowIndex={rowIndex} />);
    case "boxed":
      return wrapper(<BoxedRow row={row} rowIndex={rowIndex} />);
    case "contact":
      return wrapper(<ContactRow row={row} />);
    default:
      return null;
  }
};

const PageRows = () => {
  const data = useSiteContent<{ rows: PageRow[] }>("page_rows", { rows: DEFAULT_ROWS });
  const rows = data.rows || [];

  return (
    <>
      {rows.map((row, index) => (
        <RowRenderer key={row.id} row={row} rowIndex={index} />
      ))}
    </>
  );
};

export default PageRows;
