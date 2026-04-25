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

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, History, ChevronRight, GripVertical } from "lucide-react";
import type { PageRow } from "@/types/rows";
import { getWidget } from "@/lib/WidgetRegistry";
import { useBuilder } from "./BuilderContext";
import ElementsTray from "./ElementsTray";
// Sortable section list (drag to reorder rows from the navigator).
// We mount a NESTED DndContext so section drags don't collide with the
// outer tray/canvas drag session — the two contexts wrap disjoint DOM
// subtrees and pointer activation is local to whichever was started.
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Convert a snake_case widget type to "Snake Case" Title Case. */
const prettifyType = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Resolve a clean human label for a row in the canvas. */
const sectionLabelForRow = (row: any): string => {
  if (row?.strip_title && String(row.strip_title).trim().length > 0) {
    return String(row.strip_title);
  }
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

/** Sanitise a slug as the user types. Allows letters/digits/hyphens. */
const sanitiseSlug = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

/* ──────────────────────────────────────────────────────────────────
 * SortableSectionItem — one row in the Sections list.
 *
 * Two interactions on top of the existing click-to-jump:
 *
 *   • DOUBLE-CLICK to rename inline. The label becomes a text input
 *     committed on Blur or Enter. We commit to `row.strip_title`,
 *     which is the same field the renderer falls back to for the
 *     section label, so the change is visible immediately.
 *
 *   • DRAG (via the GripVertical handle) to reorder. The drag handle
 *     is the ONLY surface bound to dnd-kit's listeners — clicks on the
 *     label still fire `onClick` so navigation keeps working.
 * ────────────────────────────────────────────────────────────────── */
interface SortableSectionItemProps {
  id: string;
  index: number;
  label: string;
  isActive: boolean;
  onClick: () => void;
  onRename: (next: string) => void;
}

const SortableSectionItem = ({
  id,
  index,
  label,
  isActive,
  onClick,
  onRename,
}: SortableSectionItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isActive ? "hsl(var(--accent) / 0.18)" : "transparent",
    color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
    fontWeight: isActive ? 500 : 400,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-sync the local draft if the upstream label changes while we're
  // NOT editing. When editing, keep the user's in-flight text untouched.
  useEffect(() => {
    if (!editing) setDraft(label);
  }, [label, editing]);

  // Auto-focus + select the input the moment we enter rename mode.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    // Only fire an upstream write if something actually changed —
    // avoids flagging the page as dirty for a no-op double-click.
    if (trimmed && trimmed !== label) onRename(trimmed);
    else setDraft(label);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/section flex items-center gap-1 px-2 py-1.5 rounded-md font-body text-xs transition-colors"
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "hsl(var(--muted) / 0.5)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {/* Drag handle — ONLY this element binds dnd-kit listeners so
          clicks/double-clicks on the label aren't swallowed by drag. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reorder section"
        className="flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/section:opacity-60 hover:opacity-100 transition-opacity touch-none"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        <GripVertical size={12} aria-hidden />
      </button>

      <span
        className="font-mono text-[10px] tabular-nums"
        style={{ color: "hsl(var(--muted-foreground))", minWidth: 18 }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(label);
              setEditing(false);
            }
          }}
          className="flex-1 min-w-0 bg-transparent border-0 px-1 -mx-1 rounded focus:outline-none focus:ring-1"
          style={{
            color: "hsl(var(--foreground))",
            boxShadow: "inset 0 0 0 1px hsl(var(--accent) / 0.4)",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onClick}
          onDoubleClick={() => setEditing(true)}
          className="flex-1 min-w-0 truncate text-left bg-transparent border-0 p-0 cursor-pointer"
          style={{ color: "inherit" }}
          title="Click to jump · Double-click to rename"
        >
          {label}
        </button>
      )}
    </div>
  );
};

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

  /** Optional scheduling panel rendered directly under the Page URL slot.
   *  (Moved here from the right sidebar so scheduling sits with page
   *  identity instead of competing with element-level inputs.) */
  schedulePanel?: React.ReactNode;

  /** Optional revision-history panel rendered below the Elements tray
   *  inside a collapsed disclosure — out of sight until the editor wants
   *  to roll back. */
  revisionPanel?: React.ReactNode;
}

const PageNavigator = ({
  pageTitle,
  onPageTitleChange,
  pageSlug,
  onPageSlugChange,
  slugEditable = true,
  slugPrefix = "/",
  pageRows,
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
      })),
    [pageRows],
  );

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
    <div className="flex flex-col h-full">
      {/* ── Slot 1+2 ── Page identity card ───────────────────────── */}
      <div
        className="px-4 pt-4 pb-3 border-b space-y-3"
        style={{ borderColor: "hsl(var(--border) / 0.5)" }}
      >
        {/* Slot 1 — Page Title */}
        <div className="space-y-1">
          <label
            className="block font-body text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
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
              if (!titleReadOnly) e.currentTarget.style.borderColor = "hsl(var(--accent))";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "hsl(var(--border))";
            }}
          />
        </div>

        {/* Slot 2 — Page URL Slug */}
        <div className="space-y-1">
          <label
            className="block font-body text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Page URL
          </label>
          <div
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 border"
            style={{
              backgroundColor: slugReadOnly ? "hsl(var(--muted) / 0.4)" : "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
            }}
          >
            <Link2
              size={12}
              style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }}
            />
            <span
              className="font-mono text-xs select-none"
              style={{ color: "hsl(var(--muted-foreground))" }}
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

      {/* ── Slot 2b ── Schedule (publish window) ─────────────────────
          Lives directly under the Page URL block: scheduling is a
          PAGE-LEVEL setting, so it belongs with page identity rather
          than competing with element-level inputs in the right pane. */}
      {schedulePanel ? (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "hsl(var(--border) / 0.5)" }}
        >
          {schedulePanel}
        </div>
      ) : null}
      {/* ── Slot 3 ── Sections of the canvas ───────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <h3
          className="font-body text-[10px] uppercase tracking-[0.18em] font-medium mb-2"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Sections
        </h3>
      </div>
      <nav
        className="flex-shrink-0 overflow-y-auto px-2 pb-3 space-y-0.5"
        style={{ maxHeight: "32%" }}
      >
        {sections.length === 0 ? (
          <p
            className="px-3 py-2 font-body text-xs italic"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            No sections yet — drag an element onto the canvas.
          </p>
        ) : (
          sections.map((section) => {
            const isActive = section.id === activeRowId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => goToSection(section.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left font-body text-xs transition-colors group"
                style={{
                  backgroundColor: isActive
                    ? "hsl(var(--accent) / 0.18)"
                    : "transparent",
                  color: isActive
                    ? "hsl(var(--foreground))"
                    : "hsl(var(--muted-foreground))",
                  fontWeight: isActive ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.backgroundColor =
                      "hsl(var(--muted) / 0.5)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: "hsl(var(--muted-foreground))", minWidth: 18 }}
                >
                  {String(section.index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate">{section.label}</span>
              </button>
            );
          })
        )}
      </nav>

      {/* ── Slot 4 ── Elements tray ─────────────────────────────── */}
      <div
        className="flex-1 min-h-0 border-t px-3 py-3 overflow-y-auto"
        style={{ borderColor: "hsl(var(--border) / 0.5)" }}
      >
        <h3
          className="font-body text-[10px] uppercase tracking-[0.18em] font-medium mb-3"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Elements
        </h3>
        <ElementsTray />

        {/* ── Slot 5 ── Revision history (collapsed by default) ─────
            Demoted from the right sidebar: roll-back is rare, so it
            sits inside a collapsed disclosure under the Elements tray
            where it's discoverable but never in the way. */}
        {revisionPanel ? (
          <details
            className="mt-4 pt-3 border-t group"
            style={{ borderColor: "hsl(var(--border) / 0.5)" }}
          >
            <summary
              className="flex items-center gap-1.5 cursor-pointer list-none font-body text-[10px] uppercase tracking-[0.18em] font-medium select-none"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <ChevronRight
                size={12}
                className="transition-transform group-open:rotate-90"
                aria-hidden
              />
              <History size={12} aria-hidden />
              <span>Revision history</span>
            </summary>
            <div className="mt-3">{revisionPanel}</div>
          </details>
        ) : null}
      </div>
    </div>
  );
};

export default PageNavigator;
