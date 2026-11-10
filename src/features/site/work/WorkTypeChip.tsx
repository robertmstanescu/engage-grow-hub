/**
 * The type chip: the honesty label on every piece of work. An unknown
 * type prints nothing, so a chip never shows raw data.
 */
import { TYPE_CHIP } from "./workLabels";

const WorkTypeChip = ({ type }: { type: string | null | undefined }) => {
  const label = type ? TYPE_CHIP[type] : "";
  if (!label) return null;
  return (
    <span className="work-chip" data-type={type}>
      {label}
    </span>
  );
};

export default WorkTypeChip;
