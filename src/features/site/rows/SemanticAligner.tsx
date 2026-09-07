/**
 * SemanticAligner — keeps side-by-side widgets visually aligned by their
 * shared semantic lines (eyebrow → title → body).
 *
 * Rule from the design brief:
 *   - If every widget in the row lacks both eyebrow and title, leave the
 *     row's natural top alignment untouched.
 *   - Otherwise, find the deepest semantic level that is present in ALL
 *     visible widgets (body if everyone has a body, title if everyone has a
 *     title but not everyone has a body, eyebrow if everyone has an
 *     eyebrow but not everyone has a title/body).
 *   - Add just enough top padding to each widget so that shared level
 *     lines up across columns.
 *
 * The measurement is done with ResizeObserver so font loading, image
 * shifts, and responsive text changes all re-align automatically.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  /** Column content nodes. */
  columns: ReactNode[];
  /** Fractional column widths matching `columns.length`. */
  widths: number[];
  /** Disable alignment entirely (e.g. for hero or single-column rows). */
  disabled?: boolean;
  /** Cross-column gap passed through to the grid. */
  gap?: string;
  /** Vertical stretch alignment for the row grid. */
  alignItems?: "start" | "stretch";
}

type Part = "eyebrow" | "title" | "body";

interface ColumnParts {
  eyebrow?: number;
  title?: number;
  body?: number;
}

const PARTS: Part[] = ["eyebrow", "title", "body"];

const collectParts = (root: HTMLElement | null): ColumnParts | null => {
  if (!root) return null;
  const result: ColumnParts = {};
  for (const part of PARTS) {
    const el = root.querySelector(`[data-row-part="${part}"]`) as HTMLElement | null;
    if (el) {
      const rootRect = root.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      result[part] = elRect.top - rootRect.top;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
};

const SemanticAligner = ({ columns, widths, disabled, gap = "2rem", alignItems = "start" }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offsets, setOffsets] = useState<number[]>(() => Array(columns.length).fill(0));

  useLayoutEffect(() => {
    if (disabled || columns.length < 2) return;

    let innerEls: HTMLElement[] = [];

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      // Measure the INNER wrapper, which never carries the alignment
      // padding — measuring the padded outer column would feed the
      // applied offset back into the next measurement and oscillate.
      innerEls = (Array.from(container.children) as HTMLElement[])
        .map((col) => col.firstElementChild as HTMLElement | null)
        .filter(Boolean) as HTMLElement[];
      if (innerEls.length < 2) return;

      const allParts = innerEls.map(collectParts);

      // No structure at all → leave natural alignment.
      if (allParts.every((p) => !p)) return;

      // Pick the deepest part present in every column.
      let target: Part | null = null;
      for (const candidate of [...PARTS].reverse() as Part[]) {
        if (allParts.every((p) => p && typeof p[candidate] === "number")) {
          target = candidate;
          break;
        }
      }

      // Nothing shared by all columns: fall back to the FIRST part that
      // exists anywhere, so a body-only widget still starts level with
      // its neighbour's body line.
      if (!target) {
        for (const candidate of PARTS) {
          if (allParts.some((p) => p && typeof p[candidate] === "number")) {
            target = candidate;
            break;
          }
        }
      }
      if (!target) return;

      // A column missing the target part starts at its own top (0).
      const targetOffsets = allParts.map((p) => (p && typeof p[target!] === "number" ? p[target!]! : 0));
      const maxOffset = Math.max(...targetOffsets);
      const nextOffsets = targetOffsets.map((o) => Math.round(maxOffset - o));
      setOffsets((prev) =>
        prev.length === nextOffsets.length && prev.every((v, i) => v === nextOffsets[i]) ? prev : nextOffsets,
      );
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    innerEls.forEach((c) => ro.observe(c));

    document.fonts?.addEventListener?.("loadingdone", measure);

    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", measure);
    };
  }, [disabled, columns.length]);

  return (
    <div
      ref={containerRef}
      className="grid"
      style={{
        gridTemplateColumns: widths.map((w) => `${w}fr`).join(" "),
        alignItems,
        gap,
      }}
    >
      {columns.map((child, i) => (
        <div key={i} className="min-w-0" style={{ paddingTop: offsets[i] || 0 }}>
          <div className="min-w-0">{child}</div>
        </div>
      ))}
    </div>
  );
};

export default SemanticAligner;
