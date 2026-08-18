# Mesh background, section shapes, crisper buttons, and a legible admin

Two workstreams in one pass: the public-site visual upgrade (mesh, shapes, buttons) and the admin contrast fix.

---

# Part A — Public site

## A1. Mesh gradient becomes the page default

Today every row paints its own band: rows with tone "auto" alternate white / soft plum tint, so the page reads as stacked blocks and any page-level mesh is hidden behind them.

Change the default so the mesh owns the page:

- One fixed mesh layer painted behind the whole site (soft plum + gold blooms on the isabelline base), so it stays continuous while you scroll instead of restarting per section.
- Rows default to **transparent** — the mesh shows through.
- A row only gets its own background when you deliberately set one in the backend: band tone (White / Tint / Deep), a custom colour, a custom gradient, or a background image. Those keep working exactly as they do now and always win over the mesh.
- The Style tab's tone control gets a new first option, **Page mesh (default)**, alongside Auto-alternate / White / Tint / Deep, so the old alternating look is still one click away.
- Mesh intensity (subtle / medium / strong) exposed once in Brand Settings so the whole site can be tuned in one place.

## A2. Section shape options (the "boxy" curve, waves, and more)

New optional shapes on the top and/or bottom edge of any row, off by default:

- **Rounded card** — the reference screenshot: the section lifts as a large rounded rectangle over the section above it.
- **Wave** — soft single-crest wave.
- **Arch** — one wide dome, editorial and calm.
- **Angled** — a clean diagonal cut, left or right leaning.
- **Tapered curve** — gentle concave scoop, subtler than the wave.
- **Notch** — small centred cut-out, good above a section that starts with an icon or a button.
- **None** — current behaviour.

Each shape picks up the neighbouring section's colour automatically so it reads as one continuous surface, has a size control (subtle / medium / dramatic), and flattens on small screens where dramatic curves eat vertical space. Shapes are decorative only and hidden from screen readers.

Recommended starting point, changeable per row: rounded-card on the section directly after the hero, and one wave where the page moves into the deep plum band. Everything else stays flat so the shapes stay special.

## A3. Buttons

The dark pill buttons currently use a warm isabelline for their label, which reads slightly muted against the deep plum. Switch the label to pure white for the navbar Contact button, the contact form submit, and every other ink pill, and lift the hover state to match. The light "ghost" pill keeps the dark label it has today.

## A4. Other recommendations (proposals — say which you want)

- **Proof band under the hero**: three to four outcome stats or client logos. The single biggest credibility lift on a consulting site.
- **Outcome-led service cards**: lead each card with the result ("Comms people actually read"), deliverables secondary.
- **A "How we work" numbered strip**: three or four steps so buyers can picture the engagement.
- **One testimonial on a deep plum band** with client name and role — pairs naturally with the wave shape.
- **Persistent secondary CTA** in the footer band ("Book a free consultation") so the page never dead-ends.
- **Arrow text links** for tertiary actions instead of a third button style, keeping the button vocabulary at two.

---

# Part B — Fix washed-out admin highlights and icons

## What's wrong

The admin panel reuses the public site's `--secondary` token as its accent colour. Since the light-theme overhaul, `--secondary` is a pale violet **surface** colour (`285 38% 94%`), so everything painted with it — the active sidebar item, section titles like "Brand Settings" and "Media Library", chevrons, badges, toggle icons — renders near-white on a near-white background. That is the highlight/icon problem in the screenshots, not a per-component styling bug.

There is also leftover hardcoded colour in the admin shell: inline `hsl(30 20% 96%)` page backgrounds on the admin route wrappers and hardcoded `#FFFFFF` / `#1a1a1a` inputs in the tags manager.

## The fix

1. **Give the admin its own accent tokens.** Inside the `.admin-light` scope, redefine `--secondary` / `--secondary-foreground` to the readable admin indigo already used for primary actions, so every existing `text-secondary`, `bg-secondary/10`, `border-secondary` usage in the admin becomes legible without touching each file. Public-site rows are unaffected because they never render inside `.admin-light`.
2. **Strengthen the active sidebar state**: solid indigo tint background, indigo-700 label and icon, 2px left border.
3. **Remove hardcoded colours** in admin shell files:
   - Inline `backgroundColor: "hsl(30 20% 96%)"` on `Admin.tsx`, `AdminProfile.tsx`, `AdminInsights.tsx` → `bg-background`.
   - Hardcoded `#FFFFFF` / `#1a1a1a` input styles in `TagsManager.tsx` → `bg-card text-foreground` tokens. (Hex values users pick for tag colours stay as data — those are content, not theme.)
4. **Sweep the remaining admin files** (`SeoMaster`, `MediaGallery`, `VersionHistory`, `AdminOverviewDashboard`, `RevisionHistoryPanel`, `BlogEditor`, editor tabs) for other light-on-light pairings and switch them to foreground/muted-foreground tokens where the accent isn't meaningful.

---

## Verification

- Screenshots of the homepage and a service page at desktop, tablet and mobile widths: mesh continuous behind transparent rows, shapes rendering cleanly, ink pills with white labels.
- Screenshots of the admin dashboard, brand settings and media library at desktop width: active nav item, headings and icons all clearly readable.

## Technical notes

- New CSS tokens: `--gradient-mesh-page`, `--mesh-strength`, `--btn-ink-fg`. Mesh painted on a fixed, pointer-events-none layer under the app so scroll-snap and backdrop blur stay cheap.
- `RowSection` gains a `page-mesh` band mode that skips the background colour and the decorative glow overlay; the existing bandTone / bg_color / gradient / bgImage precedence is untouched.
- New `layout.shapeTop` / `layout.shapeBottom` on the row layout type (`{ kind, size, flip }`), rendered by a new `SectionShape` component using inline SVG masks; defaults live next to the other row defaults.
- New Style tab section "Shape" with top and bottom pickers, placed under Background and collapsed by default.
- Existing saved rows keep their appearance: rows already set to White / Tint / Deep are unchanged; rows on "auto" get a one-time migration flag so the mesh only applies where nothing was chosen.
- Admin changes are scoped under `.admin-light` in `src/index.css` plus the token swaps listed above; no public-site tokens change.
- No database schema or backend changes beyond the row-layout content fields.
