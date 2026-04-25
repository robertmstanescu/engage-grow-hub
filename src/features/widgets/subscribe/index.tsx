/**
 * Subscribe widget — registry entry point.
 *
 * Promotes the existing `<SubscribeWidget/>` (newsletter opt-in pill)
 * into a draggable, droppable widget so admins can place it inside any
 * cell of any row instead of relying on the per-row `show_subscribe`
 * toggle.
 *
 * The legacy `show_subscribe` flag continues to work for backwards
 * compatibility — this widget is purely additive.
 */

import { registerWidget } from "@/lib/WidgetRegistry";
import { Mail } from "lucide-react";
import SubscribeAdmin from "./SubscribeAdmin";
import SubscribeFrontend from "./SubscribeFrontend";

registerWidget({
  type: "subscribe",
  label: "Subscribe",
  icon: Mail,
  category: "Marketing",
  defaultData: {
    trigger_label: "",
    align: "center",
  },
  adminComponent: SubscribeAdmin,
  frontendComponent: SubscribeFrontend,
  render: ({ row, align }) => <SubscribeFrontend row={row} align={align} />,
});

export { SubscribeAdmin, SubscribeFrontend };
