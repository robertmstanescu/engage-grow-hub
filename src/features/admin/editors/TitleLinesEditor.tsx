/**
 * ─────────────────────────────────────────────────────────────────────────
 * TitleLinesEditor.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Repeatable "Title Lines" editor used by every row type that supports a
 * stacked multi-line headline (text rows, boxed rows, contact rows, hero
 * rows, …). Each line is edited via the project's `<TitleLineEditor>`
 * rich-text widget so the admin can apply per-line colours, italics, etc.
 *
 * PROPS
 * ─────
 *   titleLines: string[]               — array of HTML strings, one per line
 *   onChange:   (lines: string[])=>void — fires on every line mutation,
 *                                         add, or delete
 *
 * BEHAVIOUR
 * ─────────
 *  - "+ Add" pushes a new empty paragraph (`<p></p>`).
 *  - The trash-can icon next to each line removes that index.
 *  - Lines are persisted as raw HTML so the rendered page can keep the
 *    in-line formatting the admin set up here.
 *
 * WHY IT WAS EXTRACTED
 * ────────────────────
 * AdminDashboard.tsx had grown past 1500 lines. Helpers like this one
 * bloated the orchestration file with concerns that belong to the
 * "editors" sub-folder. Extracting it gives us:
 *   • A single import line in the dashboard.
 *   • A reusable widget if other admin surfaces ever need the same UI.
 *   • A clear boundary for unit tests later.
 *
 * STYLES — INLINE → TAILWIND
 * ──────────────────────────
 * All static styles were already Tailwind classes; the few remaining
 * `style={{ color: "hsl(var(--…))" }}` blocks used the design tokens, so
 * we replaced them with semantic class equivalents (`text-muted-foreground`,
 * `text-primary`, `text-destructive`, `border-primary/30`). Result: zero
 * inline styles. The visual result is pixel-identical because all colours
 * resolve to the same CSS variables.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { Plus, Trash2 } from "lucide-react";
import TitleLineEditor from "../site-editor/TitleLineEditor";
import { SectionBox } from "../site-editor/FieldComponents";

interface Props {
  /** HTML strings — one per visual line. */
  titleLines: string[];
  /** Called whenever any line is edited, added, or removed. */
  onChange: (lines: string[]) => void;
}

const TitleLinesEditor = ({ titleLines, onChange }: Props) => {
  /**
   * Mutate a single line in place. We clone the array so React notices
   * the reference change and re-renders downstream consumers.
   */
  const updateLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange(next);
  };

  return (
    <div>
      {/* Header: label on the left, "+ Add" pill on the right */}
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
          Title Lines
        </label>
        <button
          type="button"
          onClick={() => onChange([...titleLines, "<p></p>"])}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 text-primary border border-primary/30"
        >
          <Plus size={10} /> Add
        </button>
      </div>

      {/* One SectionBox per line. Each houses the rich editor + delete btn. */}
      <div className="space-y-2">
        {titleLines.map((line, i) => (
          <SectionBox key={i} label={`Line ${i + 1}`}>
            <div className="flex gap-2">
              <div className="flex-1">
                <TitleLineEditor value={line} onChange={(v) => updateLine(i, v)} />
              </div>
              <button
                type="button"
                onClick={() => onChange(titleLines.filter((_, j) => j !== i))}
                className="self-end p-2 rounded hover:opacity-70 text-destructive"
                aria-label={`Delete line ${i + 1}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

export default TitleLinesEditor;
