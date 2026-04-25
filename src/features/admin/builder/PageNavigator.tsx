/**
 * ════════════════════════════════════════════════════════════════════
 * PageNavigator — Left Sidebar Navigator
 * ════════════════════════════════════════════════════════════════════
 *
 * STRICT VERTICAL HIERARCHY (top → bottom):
 *
 *   ┌─ 1. Page Title (editable input)
 *   ├─ 2. Page URL slug (editable / read-only)
 *   ├─ 3. Schedule panel (rendered natively, immediately visible)
 *   ├─ 4. Sections (one row per page row, click-to-jump)
 *   ├─ 5. Elements tray (drag source for new widgets)
 *   └─ 6. Revision History (collapsed Accordion at the very bottom)
 *
 * The whole sidebar uses overflow-y-auto so the editor can scroll
 * cleanly even when the page has many sections / a long revision list.
 * ──────────────────────────────────────────────────────────────────── */

import { useMemo, type ReactNode } from "react";
import { Link2 } from "lucide-react";
import type { PageRow } from "@/types/rows";
import { getWidget } from "@/lib/WidgetRegistry";
import { useBuilder } from "./BuilderContext";
import ElementsTray from "./ElementsTray";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** Convert a snake_case widget type to "Snake Case" Title Case. */
const prettifyType = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Resolve a clean human label for a row in the canvas. */
const sectionLabelForRow = (row: any): string => {
  if (row?.strip_title && String(row.strip_title).trim().length > 0) {
    return String(row.strip_title);
  }
  const firstWidget = row?.columns?.[0]?.cells?.[0]?.widgets?.[0] ?? null;
  if (firstWidget?.type) {
    const def = getWidget(firstWidget.type);
    return def?.label || prettifyType(firstWidget.type);
  }
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

export interface PageNavigatorProps {
  pageTitle: string;
  onPageTitleChange?: (next: string) => void;

  pageSlug: string;
  onPageSlugChange?: (next: string) => void;

  slugEditable?: boolean;
  slugPrefix?: string;

  pageRows: PageRow[];

  /** Schedule controls rendered natively beneath the URL slug. */
  schedulePanel?: ReactNode;

  /** Revision history rendered inside the bottom Accordion. */
  revisionPanel?: ReactNode;
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

  const goToSection = (rowId: string) => {
    setActiveElement(`row:${rowId}`);
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
    /* Whole sidebar scrolls as a single column so the new strict
       hierarchy never clips off-screen on shorter viewports. */
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col">
      {/* ── 1+2 ── Page identity card ────────────────────────────── */}
      <div
        className="px-4 pt-4 pb-3 border-b space-y-3"
        style={{ borderColor: "hsl(var(--border))" }}
      >
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
              if (!titleReadOnly)
                e.currentTarget.style.borderColor =
                  "hsl(var(--admin-primary, 239 84% 53%))";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "hsl(var(--border))";
            }}
          />
        </div>

        <div className="space-y-1">
          <label className="admin-section-label block font-body text-[10px]">
            Page URL
          </label>
          <div
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 border"
            style={{
              backgroundColor: slugReadOnly
                ? "hsl(var(--muted) / 0.6)"
                : "hsl(0 0% 100%)",
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
              onChange={(e) => onPageSlugChange?.(sanitiseSlug(e.target.value))}
              placeholder={slugReadOnly ? "" : "page-slug"}
              className="flex-1 min-w-0 bg-transparent border-0 font-mono text-xs focus:outline-none p-0"
              style={{ color: "hsl(var(--foreground))" }}
            />
          </div>
        </div>
      </div>

      {/* ── 3 ── Schedule (native, immediately visible) ──────────── */}
      {schedulePanel ? (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <h3 className="admin-section-label font-body text-[10px] mb-2">
            Schedule
          </h3>
          {schedulePanel}
        </div>
      ) : null}

      {/* ── 4 ── Sections of the canvas ──────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <h3 className="admin-section-label font-body text-[10px]">Sections</h3>
      </div>
      <nav className="px-2 pb-3 space-y-0.5">
        {sections.length === 0 ? (
          <p
            className="px-3 py-2 font-body text-xs italic"
            style={{ color: "hsl(215 19% 45%)" }}
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
                data-active={isActive ? "true" : "false"}
                className="admin-sidebar-item w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left font-body text-xs"
              >
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: "inherit", opacity: 0.7, minWidth: 18 }}
                >
                  {String(section.index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate">{section.label}</span>
              </button>
            );
          })
        )}
      </nav>

      {/* ── 5 ── Elements tray ──────────────────────────────────── */}
      <div
        className="border-t px-3 py-3"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="admin-section-label font-body text-[10px] mb-3">
          Elements
        </h3>
        <ElementsTray />
      </div>

      {/* ── 6 ── Revision History (collapsed accordion, very bottom) */}
      {revisionPanel ? (
        <div
          className="mt-auto border-t"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="revisions" className="border-0">
              <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                <span className="admin-section-label font-body text-[10px]">
                  Revision History
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {revisionPanel}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : null}
    </div>
  );
};

export default PageNavigator;
