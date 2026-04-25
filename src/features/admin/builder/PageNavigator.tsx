/**
 * ════════════════════════════════════════════════════════════════════
 * PageNavigator — Left Sidebar Navigator (US 2.3)
 * ════════════════════════════════════════════════════════════════════
 *
 * Renders the LEFT pane of the visual page builder. Replaces the old
 * "Navigator" / "Elements" stack with a structured 3-zone layout that
 * makes the editing context immediately obvious:
 *
 *   ┌─ Slot 1 ─ Page Title (editable input)
 *   ├─ Slot 2 ─ Page URL Slug (editable input or read-only label)
 *   ├─ Slot 3 ─ Sections of the canvas (one row per page row, named
 *   │           by the row's strip_title / first widget label, with a
 *   │           click target that selects the row in the inspector and
 *   │           scrolls the canvas to it)
 *   └─ Slot 4 ─ Elements tray (drag source for new widgets)
 *
 * WHY THE SECTION LIST IS DERIVED, NOT STORED:
 *   Rows ARE the sections. Storing a parallel "sections" array would
 *   double the source of truth and rot. Instead we derive a friendly
 *   label from each row at render time:
 *
 *     row.strip_title          (admin-set label, takes priority)
 *       ↓
 *     widgetRegistry[type].label  (e.g. "Hero Banner")
 *       ↓
 *     prettified row.type      (e.g. "image_text" → "Image Text")
 *
 * SLUG EDITABILITY:
 *   The main page (SiteEditor) renders with `slugEditable={false}` —
 *   the homepage URL is fixed at "/". CMS pages and blog posts pass
 *   `slugEditable={true}` so editors can rename routes inline.
 *
 *   The slug input is sanitised to URL-safe characters on every change
 *   (lowercase, hyphens, no spaces) so editors can type freely without
 *   producing broken routes. Adapters validate uniqueness on save.
 * ──────────────────────────────────────────────────────────────────── */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { GripVertical, Link2 } from "lucide-react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageRow } from "@/types/rows";
import { getWidget } from "@/lib/WidgetRegistry";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBuilder } from "./BuilderContext";
import ElementsTray from "./ElementsTray";

/** Convert a snake_case widget type to "Snake Case" Title Case. */
const prettifyType = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fallbackLabelForRow = (row: any): string => {
  // v3 — first widget inside the first cell of the first column.
  const firstWidget =
    row?.columns?.[0]?.cells?.[0]?.widgets?.[0] ?? null;
  if (firstWidget?.type) {
    const def = getWidget(firstWidget.type);
    return def?.label || prettifyType(firstWidget.type);
  }
  // Legacy fallback (a row that hasn't been normalised yet).
  if (row?.type) {
    const def = getWidget(row.type);
    return def?.label || prettifyType(row.type);
  }
  return "Untitled section";
};

/** Resolve a clean human label for a row in the canvas. */
const sectionLabelForRow = (row: any): string => {
  if (row?.strip_title && String(row.strip_title).trim().length > 0) {
    return String(row.strip_title);
  }
  return fallbackLabelForRow(row);
};

export type SectionNavDragData = {
  source: "section-nav";
  rowId: string;
};

export const isSectionNavDragData = (d: unknown): d is SectionNavDragData =>
  !!d && typeof d === "object" && (d as any).source === "section-nav" && typeof (d as any).rowId === "string";

/** Sanitise a slug as the user types. Allows letters/digits/hyphens. */
const sanitiseSlug = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

export interface PageNavigatorProps {
  /** Editable page title shown at the very top. */
  pageTitle: string;
  onPageTitleChange?: (next: string) => void;

  /** Page URL slug. */
  pageSlug: string;
  onPageSlugChange?: (next: string) => void;

  /** When false, the slug field renders as a read-only badge (e.g. the
   *  main page's "/" route which can't be renamed). */
  slugEditable?: boolean;

  /** Optional URL prefix shown in front of the slug (e.g. "/" for CMS
   *  pages, "/blog/" for blog posts). */
  slugPrefix?: string;

  /** All rows in the current draft — used to render the section list. */
  pageRows: PageRow[];

  /** Update page rows when section labels are renamed from the navigator. */
  onRowsChange: (rows: PageRow[]) => void;

  /** Native scheduling panel rendered directly below Page URL. */
  schedulePanel?: ReactNode;

  /** Revision history rendered inside the bottom accordion. */
  revisionPanel?: ReactNode;
}

const SECTION_DRAG_ID_PREFIX = "section-row:";

interface SectionButtonProps {
  section: { id: string; index: number; label: string; fallbackLabel: string };
  isActive: boolean;
  onSelect: (rowId: string) => void;
  onRename: (rowId: string, next: string) => void;
}

const SectionButton = ({ section, isActive, onSelect, onRename }: SectionButtonProps) => {
  const sortable = useSortable({
    id: `${SECTION_DRAG_ID_PREFIX}${section.id}`,
    data: { source: "section-nav", rowId: section.id } satisfies SectionNavDragData,
  });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      data-active={isActive ? "true" : "false"}
      className="admin-sidebar-item group w-full flex items-center gap-2 px-2 py-1.5 rounded-md font-body text-xs"
      onClick={() => onSelect(section.id)}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing rounded p-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus:outline-none focus-visible:ring-2"
        style={{ color: "inherit", "--tw-ring-color": "hsl(var(--accent))" } as CSSProperties}
        aria-label={`Reorder ${section.label}`}
        title="Drag to reorder section"
        onClick={(e) => e.stopPropagation()}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical size={13} />
      </button>
      <span
        className="font-mono text-[10px] tabular-nums shrink-0"
        style={{ color: "inherit", opacity: 0.7, minWidth: 18 }}
      >
        {String(section.index + 1).padStart(2, "0")}
      </span>
      <input
        type="text"
        value={section.label}
        onChange={(e) => onRename(section.id, e.target.value)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(section.id);
        }}
        onFocus={() => onSelect(section.id)}
        placeholder={section.fallbackLabel}
        aria-label={`Rename ${section.label}`}
        className="min-w-0 flex-1 bg-transparent border-0 px-0 py-0.5 font-body text-xs leading-tight focus:outline-none focus-visible:ring-0"
        style={{ color: "inherit" }}
      />
    </div>
  );
};

const PageNavigator = ({
  pageTitle,
  onPageTitleChange,
  pageSlug,
  onPageSlugChange,
  slugEditable = true,
  slugPrefix = "/",
  pageRows,
  onRowsChange,
  schedulePanel,
  revisionPanel,
}: PageNavigatorProps) => {
  const { activeNodePath, setActiveElement } = useBuilder();

  /** Resolve the active row id from the selection path so we can mark
   *  the corresponding section as active in the navigator. */
  const activeRowId =
    activeNodePath && activeNodePath[0] === "row" ? activeNodePath[1] : null;

  const sections = useMemo(
    () =>
      (pageRows || []).map((row, index) => ({
        id: row.id,
        index,
        label: sectionLabelForRow(row),
        fallbackLabel: fallbackLabelForRow(row),
      })),
    [pageRows],
  );

  const renameSection = (rowId: string, next: string) => {
    onRowsChange(pageRows.map((row) => (row.id === rowId ? { ...row, strip_title: next } : row)));
  };

  /** Click-to-jump: select the row AND smoothly scroll the canvas to it.
   *  The canvas paints each row inside a `<div id={row.scope || slug>`
   *  so we walk to it via querySelector — this is identical to how the
   *  CanvasBreadcrumb resolves nodes, so behaviour stays consistent. */
  const goToSection = (rowId: string) => {
    setActiveElement(`row:${rowId}`);
    // Defer the scroll so the inspector / selection wrappers settle first.
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-section-row-id="${rowId}"]`);
      if (el && "scrollIntoView" in el) {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const titleReadOnly = !onPageTitleChange;
  const slugReadOnly = !slugEditable || !onPageSlugChange;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {/* ── Slot 1+2 ── Page identity card ───────────────────────── */}
      <div
        className="px-4 pt-4 pb-3 border-b space-y-3"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        {/* Slot 1 — Page Title (US 4.1: stronger label & input contrast) */}
        <div className="space-y-1">
          <label className="admin-section-label block font-body text-[10px]">
            Page Title
          </label>
          <input
            type="text"
            value={pageTitle}
            readOnly={titleReadOnly}
            onChange={(e) => onPageTitleChange?.(e.target.value)}
            placeholder="Untitled page"
            className="w-full bg-transparent border-0 border-b font-display text-base font-semibold leading-tight focus:outline-none focus:border-b-2 transition-colors px-0 py-1"
            style={{
              color: "hsl(var(--foreground))",
              borderColor: "hsl(var(--border))",
            }}
            onFocus={(e) => {
              if (!titleReadOnly) e.currentTarget.style.borderColor = "hsl(var(--admin-primary, 239 84% 53%))";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "hsl(var(--border))";
            }}
          />
        </div>

        {/* Slot 2 — Page URL Slug */}
        <div className="space-y-1">
          <label className="admin-section-label block font-body text-[10px]">
            Page URL
          </label>
          <div
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 border"
            style={{
              backgroundColor: slugReadOnly ? "hsl(var(--muted) / 0.6)" : "hsl(0 0% 100%)",
              borderColor: "hsl(var(--border))",
            }}
          >
            <Link2
              size={12}
              style={{ color: "hsl(215 19% 35%)", flexShrink: 0 }}
            />
            <span
              className="font-mono text-xs select-none"
              style={{ color: "hsl(215 19% 35%)" }}
            >
              {slugPrefix}
            </span>
            <input
              type="text"
              value={pageSlug}
              readOnly={slugReadOnly}
              onChange={(e) =>
                onPageSlugChange?.(sanitiseSlug(e.target.value))
              }
              placeholder={slugReadOnly ? "" : "page-slug"}
              className="flex-1 min-w-0 bg-transparent border-0 font-mono text-xs focus:outline-none p-0"
              style={{ color: "hsl(var(--foreground))" }}
            />
          </div>
        </div>
      </div>

      {schedulePanel ? (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          {schedulePanel}
        </div>
      ) : null}

      {/* ── Slot 3 ── Sections of the canvas ───────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <h3 className="admin-section-label font-body text-[10px] mb-2">
          Sections
        </h3>
      </div>
      <nav className="flex-shrink-0 px-2 pb-3 space-y-0.5">
        {sections.length === 0 ? (
          <p
            className="px-3 py-2 font-body text-xs italic"
            style={{ color: "hsl(215 19% 45%)" }}
          >
            No sections yet — drag an element onto the canvas.
          </p>
        ) : (
          <SortableContext items={sections.map((section) => `${SECTION_DRAG_ID_PREFIX}${section.id}`)} strategy={verticalListSortingStrategy}>
            {sections.map((section) => (
              <SectionButton
                key={section.id}
                section={section}
                isActive={section.id === activeRowId}
                onSelect={goToSection}
                onRename={renameSection}
              />
            ))}
          </SortableContext>
        )}
      </nav>

      {/* ── Slot 4 ── Elements tray ─────────────────────────────── */}
      <div
        className="flex-1 min-h-0 border-t px-3 py-3 overflow-y-auto"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="admin-section-label font-body text-[10px] mb-3">
          Elements
        </h3>
        <ElementsTray />
      </div>
    </div>
  );
};

export default PageNavigator;
