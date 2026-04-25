/**
 * widgets/index.ts — boot-time widget registration.
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * The `WidgetRegistry` is empty until something calls `registerWidget()`.
 * To keep the engine OPEN-FOR-EXTENSION but CLOSED-FOR-MODIFICATION, we
 * isolate ALL registration calls in this single bootstrap module. The
 * app imports it ONCE (from `App.tsx` / `main.tsx`) before the first
 * render — at that point the registry is fully populated and the
 * `<PageRows>` engine can dispatch `row.type` → component without any
 * hardcoded knowledge of individual widgets.
 *
 * Adding a new widget is therefore a 4-step, surgical change:
 *   1. Define the data schema (in `src/types/rows.ts` if shared).
 *   2. Build the admin component (`content`, `onChange`).
 *   3. Build the public component (`row`).
 *   4. Add ONE `registerWidget(...)` call below.
 *
 * No edits to `PageRows.tsx`, `RowsManager.tsx`, or any other engine
 * file are required. See `WIDGETS.md` at the repo root for the full
 * walkthrough.
 */

import { registerWidget } from "@/lib/WidgetRegistry";

import HeroRow from "@/features/site/rows/HeroRow";
import TextRow from "@/features/site/rows/TextRow";
import ServiceRow from "@/features/site/rows/ServiceRow";
import BoxedRow from "@/features/site/rows/BoxedRow";
import ContactRow from "@/features/site/rows/ContactRow";
import ImageTextRow from "@/features/site/rows/ImageTextRow";
import ProfileRow from "@/features/site/rows/ProfileRow";
import GridRow from "@/features/site/rows/GridRow";
import LeadMagnetRow from "@/features/site/rows/LeadMagnetRow";
import TestimonialRow from "@/features/site/rows/TestimonialRow";
import LogoCloudRow from "@/features/site/rows/LogoCloudRow";
import FaqRow from "@/features/site/rows/FaqRow";

/* ──────────────────────────────────────────────────────────────────────
 * Built-in widget registrations.
 *
 * Each entry maps `PageRow["type"]` → render function. The render fn
 * adapts the standard `WidgetRenderContext` to the (sometimes legacy)
 * prop signature of each row component, so individual renderers don't
 * need to be refactored to fit a one-size-fits-all signature.
 * ────────────────────────────────────────────────────────────────────── */

registerWidget({
  type: "hero",
  defaultData: {},
  frontendComponent: HeroRow,
  render: ({ row }) => <HeroRow row={row} />,
});

registerWidget({
  type: "text",
  defaultData: { title_lines: [], subtitle: "", body: "" },
  render: ({ row, rowIndex, align, vAlign }) => (
    <TextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "service",
  defaultData: { eyebrow: "", title: "", description: "", services: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <ServiceRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "boxed",
  defaultData: { title_lines: [], cards: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <BoxedRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "contact",
  defaultData: {},
  render: ({ row, align, vAlign }) => (
    <ContactRow row={row} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "image_text",
  defaultData: {},
  render: ({ row, rowIndex, align, vAlign }) => (
    <ImageTextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "profile",
  defaultData: {},
  render: ({ row, rowIndex, align, vAlign }) => (
    <ProfileRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "grid",
  defaultData: { items: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <GridRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "lead_magnet",
  defaultData: {},
  render: ({ row, rowIndex, align, vAlign }) => (
    <LeadMagnetRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "testimonial",
  defaultData: { items: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <TestimonialRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "logo_cloud",
  defaultData: { logos: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <LogoCloudRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "faq",
  defaultData: { items: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <FaqRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

// Re-export so callers can grab the registry helpers from one place.
export { getWidget, listWidgets, hasWidget, renderWidget } from "@/lib/WidgetRegistry";
