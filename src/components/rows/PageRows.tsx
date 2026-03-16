import { useSiteContent } from "@/hooks/useSiteContent";
import { DEFAULT_ROWS, type PageRow } from "@/types/rows";
import TextRow from "./TextRow";
import ServiceRow from "./ServiceRow";
import BoxedRow from "./BoxedRow";
import ContactRow from "./ContactRow";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RowRenderer = ({ row }: { row: PageRow }) => {
  const id = row.scope || slugify(row.strip_title);
  const wrapper = (children: React.ReactNode) => (
    <div id={id} style={{ scrollMarginTop: "4rem" }}>{children}</div>
  );

  switch (row.type) {
    case "text":
      return wrapper(<TextRow row={row} />);
    case "service":
      return wrapper(<ServiceRow row={row} />);
    case "boxed":
      return wrapper(<BoxedRow row={row} />);
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
      {rows.map((row) => (
        <RowRenderer key={row.id} row={row} />
      ))}
    </>
  );
};

export default PageRows;
