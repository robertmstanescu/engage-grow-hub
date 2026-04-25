/**
 * SubscribeFrontend — registry-facing wrapper around <SubscribeWidget/>.
 *
 * Reads `trigger_label` and `align` from the widget content and
 * forwards them. The form, validation, and submission logic stay in
 * the existing component so behaviour matches the legacy `show_subscribe`
 * placement everywhere on the site.
 */
import type { PageRow } from "@/types/rows";
import SubscribeWidget from "@/features/site/SubscribeWidget";

interface SubscribeFrontendProps {
  row: PageRow;
  align?: "left" | "center" | "right";
}

const SubscribeFrontend = ({ row, align: outerAlign }: SubscribeFrontendProps) => {
  const c = (row.content || {}) as { trigger_label?: string; align?: "left" | "center" | "right" };
  const align = c.align ?? outerAlign ?? "center";
  return <SubscribeWidget align={align} triggerLabel={c.trigger_label} />;
};

export default SubscribeFrontend;
