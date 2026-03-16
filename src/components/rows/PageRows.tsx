import { useSiteContent } from "@/hooks/useSiteContent";
import { DEFAULT_ROWS, type PageRow } from "@/types/rows";
import TextRow from "./TextRow";
import ServiceRow from "./ServiceRow";
import BoxedRow from "./BoxedRow";
import ContactRow from "./ContactRow";

const RowRenderer = ({ row }: { row: PageRow }) => {
  switch (row.type) {
    case "text":
      return <TextRow row={row} />;
    case "service":
      return <ServiceRow row={row} />;
    case "boxed":
      return <BoxedRow row={row} />;
    case "contact":
      return <ContactRow row={row} />;
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
