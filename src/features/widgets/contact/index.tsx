/**
 * Contact widget — registry entry point.
 *
 * This is the single file you import from the widgets bootstrap to
 * make the contact form available as a modular block. It wires:
 *   - admin editor (ContactAdmin)
 *   - public renderer (ContactFrontend → ContactRow)
 *   - default data shape (matches the legacy `contact` row content)
 *
 * Adding it to a column in the new layout-only rows (US 1.2) becomes
 * a registry lookup: pick "Contact" from the Add-Widget menu, the
 * registry instantiates `ContactAdmin` for the properties panel and
 * `ContactFrontend` for the public site.
 */

import { registerWidget } from "@/lib/WidgetRegistry";
import { Mail } from "lucide-react";
import { lazy } from "react";
// Loaded lazily: the editor must never ride along in the public bundle.
const ContactAdmin = lazy(() => import("./ContactAdmin"));
import ContactFrontend from "./ContactFrontend";

registerWidget({
  type: "contact",
  label: "Book a call",
  icon: Mail,
  category: "Marketing",
  defaultData: {
    title_lines: [],
    body: "",
    booking_button_text: "Book a discovery call",
    show_calendar: true,
  },
  adminComponent: ContactAdmin,
  frontendComponent: ContactFrontend,
  // Contact is an "alignment-aware" widget — pass align/vAlign through.
  render: ({ row, align, vAlign }) => (
    <ContactFrontend row={row} align={align} vAlign={vAlign} />
  ),
});

export { ContactFrontend };
