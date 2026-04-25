# How to Build a Widget

> **Audience:** developers (especially juniors) extending the Magic Coffin
> page builder. Read this end-to-end before adding a new block.

The page builder is **registry-driven**. Adding a widget never requires
editing `PageRows.tsx`, `RowsManager.tsx`, or any other engine file.
You write three small files and a single registration call. That's it.

Every widget follows the same 4-step recipe. Skip a step and the widget
will silently no-op or, worse, render unsanitised content. Don't skip.

---

## Step 1 — Define the Data Schema

**What:** a TypeScript `interface` describing the JSON shape that will
be stored in the database for this widget instance.

**Where:** co-locate it inside your widget folder
(`src/features/widgets/<name>/types.ts`) **unless** the shape is shared
with other parts of the app — then put it in `src/types/rows.ts`.

```ts
// src/features/widgets/countdown/types.ts
export interface CountdownData {
  /** ISO 8601 timestamp the countdown ticks down to. */
  target_iso: string;
  /** Heading shown above the digits. */
  heading: string;
  /** Message displayed once the timer hits zero. */
  expired_text: string;
}

export const DEFAULT_COUNTDOWN: CountdownData = {
  target_iso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  heading: "Doors close in",
  expired_text: "Registration is now closed.",
};
```

**Rules:**

- Every field must be **optional-friendly**: the public renderer must
  cope with `undefined` (see the QA matrix on corrupted data).
- Defaults live next to the interface, **not** scattered through the
  admin and frontend components.
- Don't reach into the database from the schema file. The schema is
  pure data — it doesn't know about Supabase.

---

## Step 2 — Build the Admin Component

**What:** the editor surface that appears in the right-hand Properties
panel when an admin selects this widget.

**Contract (mandatory — do not deviate):**

```ts
interface AdminProps<TData> {
  content: TData;                                 // current saved data
  onChange: (field: string, value: any) => void;  // patch one field
}
```

**Where:** `src/features/widgets/<name>/<Name>Admin.tsx`.

```tsx
// src/features/widgets/countdown/CountdownAdmin.tsx
import type { CountdownData } from "./types";
import { Field } from "@/features/admin/site-editor/FieldComponents";

interface Props {
  content: CountdownData;
  onChange: (field: string, value: any) => void;
}

const CountdownAdmin = ({ content, onChange }: Props) => (
  <div className="space-y-3">
    <Field
      label="Target date (ISO 8601)"
      value={content.target_iso ?? ""}
      onChange={(v) => onChange("target_iso", v)}
    />
    <Field
      label="Heading"
      value={content.heading ?? ""}
      onChange={(v) => onChange("heading", v)}
    />
    <Field
      label="Expired message"
      value={content.expired_text ?? ""}
      onChange={(v) => onChange("expired_text", v)}
    />
  </div>
);

export default CountdownAdmin;
```

**Rules:**

- Use the shared field components from
  `src/features/admin/site-editor/FieldComponents.tsx` (`Field`,
  `RichField`, `ColorField`, `SectionBox`, …) so you inherit the
  admin's look-and-feel for free.
- **Never** call `onChange("html", DOMPurify.sanitize(raw))` and store
  the sanitised result. Store the **raw** input — sanitise on render.
  Sanitisation rules will tighten over time and old content needs to
  benefit automatically. (See `EmbedAdmin.tsx` for the canonical
  pattern.)
- Don't fetch data here. The admin is a controlled form, nothing more.

---

## Step 3 — Build the Public Component

**What:** the component shown to visitors on the live site.

**Contract:** receives a `row: PageRow`. Read the widget's typed data
out of `row.content`. Optionally accept `align` and `vAlign` if your
widget should honour the row's alignment settings.

**Where:** `src/features/widgets/<name>/<Name>Frontend.tsx`.

```tsx
// src/features/widgets/countdown/CountdownFrontend.tsx
import { useEffect, useState } from "react";
import type { PageRow } from "@/types/rows";
import type { CountdownData } from "./types";
import { DEFAULT_COUNTDOWN } from "./types";

interface Props {
  row: PageRow;
  align?: "left" | "right" | "center";
}

const CountdownFrontend = ({ row, align = "center" }: Props) => {
  // WHY this defensive merge: the QA matrix REQUIRES every widget to
  // render without crashing when its data is null, partial, or has
  // been corrupted by an old DB migration. Spreading defaults first
  // means every required field has a value before we read it.
  const data: CountdownData = {
    ...DEFAULT_COUNTDOWN,
    ...((row.content ?? {}) as Partial<CountdownData>),
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = Date.parse(data.target_iso);
  const remaining = Number.isFinite(target) ? target - now : 0;
  const expired = remaining <= 0;

  return (
    <div style={{ textAlign: align }}>
      <h3>{data.heading}</h3>
      {expired ? <p>{data.expired_text}</p> : <p>{Math.ceil(remaining / 1000)}s</p>}
    </div>
  );
};

export default CountdownFrontend;
```

**Rules:**

- **Always** merge with defaults before reading fields. Treat
  `row.content` as untrusted JSON. (See QA matrix below.)
- **Never** call `dangerouslySetInnerHTML` with raw user input. If you
  need HTML, route it through `sanitizeHtml` (rich text) or
  `sanitizeEmbedHtml` (raw embeds) from `src/services/sanitize.ts`.
- Honour `align` / `vAlign` if your widget has free space. Don't
  invent your own alignment props.
- Public components are server-render-friendly: no `window` access at
  module scope (only inside `useEffect`).

---

## Step 4 — Call `registerWidget(...)`

**What:** the line that makes your widget visible to the engine.

**Where:** `src/features/widgets/<name>/index.tsx` (one file per widget).
Then add **one line** to `src/widgets/index.tsx` so the registration
runs at app boot.

```tsx
// src/features/widgets/countdown/index.tsx
import { registerWidget } from "@/lib/WidgetRegistry";
import CountdownAdmin from "./CountdownAdmin";
import CountdownFrontend from "./CountdownFrontend";
import { DEFAULT_COUNTDOWN } from "./types";

registerWidget({
  type: "countdown",                  // unique key, matches PageRow["type"]
  label: "Countdown Timer",           // shown in the Add-Widget menu
  defaultData: DEFAULT_COUNTDOWN,     // seeds new instances
  adminComponent: CountdownAdmin,
  frontendComponent: CountdownFrontend,
  // Pass align/vAlign through if the widget uses them.
  render: ({ row, align }) => <CountdownFrontend row={row} align={align} />,
});
```

```ts
// src/widgets/index.tsx — append ONE line:
import "@/features/widgets/countdown";
```

**Rules:**

- Keep the registration file **side-effect-only** — don't export
  components from it (re-export from your `Admin`/`Frontend` files
  directly if needed).
- The `type` string is permanent. Renaming it requires a DB migration
  to update existing rows. Pick carefully.
- Add the new type to the `PageRow["type"]` union in
  `src/types/rows.ts` so TypeScript knows about it.

---

## The "Why" Comment Standard

Juniors copy-paste working code without understanding. To stop that
producing landmines later, **every block of non-obvious logic must
explain WHY it exists, not what it does.** The compiler shows you
*what*; comments must answer *why*.

This is a hard rule for these areas:

1. **`@dnd-kit` state updates** — anything that mutates row, column,
   or widget arrays during a drag.
2. **Sanitisation calls** — every place we trust user-supplied HTML.
3. **Migration logic** — any branch that exists "for legacy data".
4. **Event handler lifetimes** — `useEffect` cleanup, sensor
   activation constraints, abort controllers.

### Good (explains the WHY)

```ts
// WHY: We use arrayMove here because dnd-kit gives us the old and new
// indices. We must update the state immutably so React triggers a
// re-render — mutating `widgets` in place wouldn't change its
// reference and the SortableContext would silently render stale order.
onChange(arrayMove(widgets, oldIndex, newIndex));
```

```ts
// WHY a single DndContext (not nested ones): nested DndContexts in
// @dnd-kit don't see each other's items, so cross-container drags
// become impossible. The official "Multiple Containers" recipe uses
// one context and routes by id-prefix — that's what we do here.
const handleDragEnd = (event: DragEndEvent) => { /* … */ };
```

```ts
// WHY swap (not splice) on widget cell drops: with one widget per cell
// in the legacy schema, splicing would shift every subsequent cell
// AND require rebalancing column widths. Swap keeps the column
// geometry untouched and is what users expect from drag-to-reorganise.
next = writeCell(next, target.rowId, target.colIdx, sourceContent);
next = writeCell(next, source.rowId, source.colIdx, targetContent);
```

### Bad (just restates the code)

```ts
// Move the item from oldIndex to newIndex
onChange(arrayMove(widgets, oldIndex, newIndex));

// Sanitise the html
const safe = sanitizeEmbedHtml(raw);
```

If a senior reviewer can read the code and immediately see *what*
happens, the comment isn't earning its keep. Replace it with the
*why* — the constraint, the trade-off, or the rejected alternative.

### Self-check before opening a PR

- [ ] Every `onDragEnd` / `onDragOver` mutation has a `// WHY:` comment.
- [ ] Every `dangerouslySetInnerHTML` is one line away from a
      sanitiser, with a comment naming the sanitiser used.
- [ ] Every `// legacy` / `// migration` branch explains what shape it
      handles and when it can be removed.

---

## QA Testing Matrix

Don't just test the happy path. Every widget must be exercised across
**three axes** before it ships. The matrix below is the minimum.

### Axis 1 — Viewport

| Viewport          | What to verify |
|-------------------|----------------|
| Desktop (1440px+) | Layout, hover states, alignment props all behave. |
| Tablet (768px)    | No horizontal scroll. Touch targets ≥ 44 px. |
| Mobile (375px)    | Text doesn't overflow. Embeds scale to width. Heavy media (video, large images) degrade per `mem://ui/animations`. |

Use **`browser--set_viewport_size`** to flip between viewports without
restarting the session — auth, console logs, and network history are
preserved.

### Axis 2 — Column Width

The same widget can land in a 100%-wide row, a 50/50 split, or a
25-wide cell of a 4-column row. It must not break in any of them.

| Column width | What to verify |
|--------------|----------------|
| 100% (full)  | Widget uses the available space without looking lost. Max-width caps kick in for long text. |
| 50%          | Internal grid collapses to a single column at the mobile breakpoint. Buttons remain tappable. |
| 25%          | Text wraps cleanly. Images don't overflow. The "Add Widget" affordance (when empty) stays legible. |

> **Tip:** for embeds (YouTube, Typeform…) verify the iframe respects
> the cell's `max-width`. A naked `<iframe width="560">` will burst
> out of a 25% cell — wrap with `style="max-width:100%"` if needed.

### Axis 3 — Data Integrity

Real production data is messy. A widget that crashes on a missing
field takes the **whole page** down (because `<PageRows>` is a single
React tree). Test these cases explicitly:

| Data state            | Expected behaviour |
|-----------------------|--------------------|
| `content` is `null`   | Render nothing (or a sensible default). **No crash.** |
| `content` is `{}`     | Use defaults from the schema. Render the empty/placeholder state. |
| One required field is `undefined` | Default kicks in via the spread merge in Step 3. |
| A field is the wrong type (e.g. number where string expected) | Coerce to string or fall back to the default. Never `.toUpperCase()` an unknown value. |
| The widget `type` exists in the DB but isn't registered | `WidgetRegistry.renderWidget` returns `null` and logs a warning — the rest of the page still renders. Verify the warning fires once, not on every re-render. |
| Sanitisation strips everything (e.g. embed contained only `<script>`) | Public site renders nothing; admin shows the "some markup was removed" banner. |

### Axis 4 (when applicable) — Drag & Drop

If the widget can be moved between cells via the nested DnD surface:

| Drag scenario                                       | Expected behaviour |
|-----------------------------------------------------|--------------------|
| Drag widget X over widget Y in the same row         | Cell contents swap. Column widths unchanged. |
| Drag widget X into an EMPTY cell                    | Widget moves; source cell becomes empty. |
| Drag widget X into a cell in a different row of the same `type` | Lossless move. |
| Drag widget X into a cell in a row of a different `type` | Blocked with a sonner toast. Source data untouched. |
| Drag the row strip handle                           | Vertical row reorder still works (independent of widget DnD). |

---

## Reference Implementations

When in doubt, copy the structure of a working widget:

- **`src/features/widgets/contact/`** — full-featured widget with
  configurable fields, success state, and a custom `render` adapter
  that forwards alignment props.
- **`src/features/widgets/embed/`** — security-critical widget; shows
  the canonical pattern for `dangerouslySetInnerHTML` + sanitiser, plus
  a sanitised live preview in the admin.
- **`src/lib/WidgetRegistry.tsx`** — the registry itself, including
  the `WidgetDefinition` type and the `renderWidget` dispatch.

---

## TL;DR Checklist

Before you open the PR:

- [ ] **Step 1.** Schema interface + `DEFAULT_*` constant defined.
- [ ] **Step 2.** `XAdmin.tsx` uses `{ content, onChange }`. Stores raw
      input, never pre-sanitised values.
- [ ] **Step 3.** `XFrontend.tsx` merges defaults before reading data.
      Uses `sanitizeHtml` / `sanitizeEmbedHtml` for any HTML rendering.
- [ ] **Step 4.** `registerWidget(...)` called from `index.tsx` + one
      side-effect import in `src/widgets/index.tsx`.
- [ ] `PageRow["type"]` union updated.
- [ ] Every `@dnd-kit` mutation and every `dangerouslySetInnerHTML`
      has a `// WHY:` comment.
- [ ] QA matrix executed: 3 viewports × 3 column widths × 6 data states.
