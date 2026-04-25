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
import {
  ImageIcon,
  Type,
  LayoutGrid,
  Boxes,
  ImagePlus,
  UserSquare2,
  Grid3x3,
  MailOpen,
  Quote,
  GalleryHorizontalEnd,
  HelpCircle,
} from "lucide-react";

import HeroRow from "@/features/site/rows/HeroRow";
import TextRow from "@/features/site/rows/TextRow";
import ServiceRow from "@/features/site/rows/ServiceRow";
import BoxedRow from "@/features/site/rows/BoxedRow";
import ImageTextRow from "@/features/site/rows/ImageTextRow";
import ImageRow, { ImageRowAdmin, IMAGE_ROW_DEFAULT } from "@/features/site/rows/ImageRow";
import ProfileRow from "@/features/site/rows/ProfileRow";
import GridRow from "@/features/site/rows/GridRow";
import LeadMagnetRow from "@/features/site/rows/LeadMagnetRow";
import TestimonialRow from "@/features/site/rows/TestimonialRow";
import LogoCloudRow from "@/features/site/rows/LogoCloudRow";
import FaqRow from "@/features/site/rows/FaqRow";

// Modular widgets — each self-registers on import. Keep this list
// alphabetical so it's obvious whether a given widget is wired up.
import "@/features/widgets/contact";
import "@/features/widgets/cta-button";
import "@/features/widgets/subscribe";

/* ──────────────────────────────────────────────────────────────────────
 * Built-in widget registrations.
 *
 * Each entry maps `PageRow["type"]` → render function. The render fn
 * adapts the standard `WidgetRenderContext` to the (sometimes legacy)
 * prop signature of each row component, so individual renderers don't
 * need to be refactored to fit a one-size-fits-all signature.
 *
 * `label`, `icon` and `category` (US 17.1) drive the Elements Tray —
 * the draggable widget library in the Left Sidebar. Keep them concise:
 * one short noun ("Hero", "Text", "Image + Text") plus a recognisable
 * Lucide glyph.
 * ────────────────────────────────────────────────────────────────────── */

registerWidget({
  type: "hero",
  label: "Hero",
  icon: ImageIcon,
  category: "Layout",
  defaultData: {},
  frontendComponent: HeroRow,
  render: ({ row }) => <HeroRow row={row} />,
});

registerWidget({
  type: "text",
  label: "Text",
  icon: Type,
  category: "Content",
  defaultData: { title_lines: [], subtitle: "", body: "" },
  render: ({ row, rowIndex, align, vAlign }) => (
    <TextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "service",
  label: "Services",
  icon: LayoutGrid,
  category: "Content",
  defaultData: { eyebrow: "", title: "", description: "", services: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <ServiceRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "boxed",
  label: "Boxed Cards",
  icon: Boxes,
  category: "Content",
  defaultData: { title_lines: [], cards: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <BoxedRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

// `contact` is registered by `src/features/widgets/contact/index.tsx`
// (imported above). Do not re-register here — last write would win.


registerWidget({
  type: "image_text",
  label: "Image + Text",
  icon: ImagePlus,
  category: "Media",
  defaultData: {},
  render: ({ row, rowIndex, align, vAlign }) => (
    <ImageTextRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

// EPIC 13 / US 13.1 — standalone Image widget. Strict alt-text enforcement
// is provided by `findMissingAltViolations` in services/contentAccessibility.
registerWidget({
  type: "image",
  label: "Image",
  icon: ImageIcon,
  category: "Media",
  defaultData: { ...IMAGE_ROW_DEFAULT },
  adminComponent: ImageRowAdmin as any,
  frontendComponent: ImageRow,
  render: ({ row }) => <ImageRow row={row} />,
});

registerWidget({
  type: "profile",
  label: "Profile",
  icon: UserSquare2,
  category: "Content",
  defaultData: {},
  render: ({ row, rowIndex, align, vAlign }) => (
    <ProfileRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "grid",
  label: "Grid",
  icon: Grid3x3,
  category: "Layout",
  defaultData: { items: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <GridRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "lead_magnet",
  label: "Lead Magnet",
  icon: MailOpen,
  category: "Marketing",
  defaultData: {},
  render: ({ row, rowIndex, align, vAlign }) => (
    <LeadMagnetRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "testimonial",
  label: "Testimonials",
  icon: Quote,
  category: "Social",
  defaultData: { items: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <TestimonialRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "logo_cloud",
  label: "Logo Cloud",
  icon: GalleryHorizontalEnd,
  category: "Social",
  defaultData: { logos: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <LogoCloudRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

registerWidget({
  type: "faq",
  label: "FAQ",
  icon: HelpCircle,
  category: "Content",
  defaultData: { items: [] },
  render: ({ row, rowIndex, align, vAlign }) => (
    <FaqRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

// Re-export so callers can grab the registry helpers from one place.
export { getWidget, listWidgets, hasWidget, renderWidget } from "@/lib/WidgetRegistry";
