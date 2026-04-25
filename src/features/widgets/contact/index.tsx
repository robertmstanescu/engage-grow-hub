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
import { DEFAULT_CONTACT_FIELDS } from "@/lib/constants/rowDefaults";
import { Mail } from "lucide-react";
import ContactAdmin from "./ContactAdmin";
import ContactFrontend from "./ContactFrontend";

registerWidget({
  type: "contact",
  label: "Contact Form",
  icon: Mail,
  category: "Marketing",
  defaultData: {
    title_lines: [],
    body: "",
    button_text: "Request a discovery call",
    success_heading: "Message received.",
    success_body: "We respond within 24 hours.",
    success_button: "Send another message",
    show_social: false,
    fields: DEFAULT_CONTACT_FIELDS,
  },
  adminComponent: ContactAdmin,
  frontendComponent: ContactFrontend,
  // Contact is an "alignment-aware" widget — pass align/vAlign through.
  render: ({ row, align, vAlign }) => (
    <ContactFrontend row={row} align={align} vAlign={vAlign} />
  ),
});

export { ContactAdmin, ContactFrontend };
