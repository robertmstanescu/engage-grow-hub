/**
 * Embed widget — registry entry point.
 *
 * One-line bootstrap: importing this file is enough to make the
 * "embed" widget available to the page builder. Mirrors the pattern
 * established by the Contact widget.
 *
 * Schema:
 *   content.html          — raw HTML pasted by the editor (sanitised
 *                           on render, never stored differently)
 *   content.aspect_ratio  — reserved for future "force 16:9" toggle
 *
 * WHY we store the RAW html (not pre-sanitised):
 * Sanitisation rules will evolve. Storing the raw input means we can
 * tighten OR loosen the allow-list later and existing embeds will
 * automatically benefit, without requiring a data migration.
 */

import { registerWidget } from "@/lib/WidgetRegistry";
import EmbedAdmin from "./EmbedAdmin";
import EmbedFrontend from "./EmbedFrontend";

registerWidget({
  type: "embed",
  label: "HTML / Iframe Embed",
  defaultData: {
    html: "",
    aspect_ratio: "auto",
  },
  adminComponent: EmbedAdmin,
  frontendComponent: EmbedFrontend,
  // Pass alignment so the embed honours the row's horizontal alignment.
  render: ({ row, align, vAlign }) => (
    <EmbedFrontend row={row} align={align} vAlign={vAlign} />
  ),
});

export { EmbedAdmin, EmbedFrontend };
