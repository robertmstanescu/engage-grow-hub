/**
 * ─────────────────────────────────────────────────────────────────────────
 * StyleTab.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Generic "Style" sub-tab shown in the Properties panel of the Admin
 * Dashboard when the user has the **Hero** section selected.
 *
 * It renders a tiny demo of two visual controls:
 *   1. A range slider labelled "Glass card intensity"
 *   2. A checkbox labelled "Enable gradient text", followed by a small
 *      4px-tall gradient strip that previews the brand gradient.
 *
 * NOTE FOR FUTURE MAINTAINERS
 * ───────────────────────────
 * - This component is intentionally **uncontrolled** today. The inputs use
 *   `defaultValue`/`defaultChecked` and their state never feeds back into
 *   the saved row content. It exists as a UI placeholder; wire the values
 *   into the `hero` site_content section if/when product asks for it.
 * - It was extracted out of the (very large) AdminDashboard.tsx so that
 *   the dashboard stays close to a single screenful of orchestration code.
 *   The dashboard now imports `<StyleTab />` from this file.
 *
 * STYLES — INLINE → TAILWIND
 * ──────────────────────────
 * The original inline styles relied on `style={{ ... }}` blocks. Per the
 * project's design system (see Core memory), components MUST use Tailwind
 * utility classes referencing semantic tokens (e.g. `text-muted-foreground`,
 * `bg-secondary`) rather than hard-coded colours. Static rules are now
 * Tailwind utilities; only the gradient background — which actually USES
 * the brand HSL tokens via `linear-gradient(...)` — stays inline because
 * Tailwind has no first-class utility for arbitrary multi-stop gradients
 * built from CSS variables.
 *
 * The `accent-secondary` class isn't a stock Tailwind utility, so for the
 * range slider's accent colour we keep `accentColor: "hsl(var(--secondary))"`
 * inline — there is no equivalent class without configuring tailwind.config.
 * ─────────────────────────────────────────────────────────────────────────
 */

const StyleTab = () => (
  <div className="flex flex-col gap-4">
    {/* Glass card intensity slider */}
    <div>
      <label className="font-body text-[10px] uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">
        Glass card intensity
      </label>
      <input
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        className="w-full"
        style={{ accentColor: "hsl(var(--secondary))" }}
      />
    </div>

    {/* Gradient text toggle + preview strip */}
    <div>
      <label className="font-body text-[10px] uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">
        Gradient text
      </label>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          defaultChecked={false}
          style={{ accentColor: "hsl(var(--secondary))" }}
        />
        <span className="font-body text-[11px] text-foreground">
          Enable gradient text
        </span>
      </div>
      {/* 4px-tall gradient strip showing the brand gradient. The gradient
          uses BOTH brand HSL tokens, so we keep this as an inline style. */}
      <div
        className="h-1 rounded-sm mt-2"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
        }}
      />
    </div>
  </div>
);

export default StyleTab;
