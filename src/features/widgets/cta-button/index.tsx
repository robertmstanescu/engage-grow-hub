/**
 * CTA Button widget — registry entry point.
 *
 * Promotes the per-row `cta_label` / `cta_url` field pair into a
 * standalone draggable widget so admins can place call-to-action
 * buttons inside any cell instead of being limited to one CTA at the
 * tail of certain row types.
 *
 * The legacy per-row CTA fields keep working — this widget is purely
 * additive and can coexist with them.
 */

import { registerWidget } from "@/lib/WidgetRegistry";
import { MousePointerClick } from "lucide-react";
import CtaButtonAdmin from "./CtaButtonAdmin";
import CtaButtonFrontend from "./CtaButtonFrontend";

registerWidget({
  type: "cta_button",
  label: "CTA Button",
  icon: MousePointerClick,
  category: "Marketing",
  defaultData: {
    cta_label: "Book a call",
    cta_url: "/contact",
    align: "center",
  },
  adminComponent: CtaButtonAdmin,
  frontendComponent: CtaButtonFrontend,
  render: ({ row, align }) => <CtaButtonFrontend row={row} align={align} />,
});

export { CtaButtonAdmin, CtaButtonFrontend };
