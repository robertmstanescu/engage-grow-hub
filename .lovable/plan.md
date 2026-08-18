# Unified type scale, row separators, and a cleaner page builder

## 1. One typography scale, no hardcoded sizes

Today each component invents its own size. Confirmed examples: `RowTitle` uses `clamp(1.2rem, 1.8vh + 1.3vw, 2.6rem)` while `VowsSection` hardcodes `clamp(1.5rem, 1.5vh + 1.4vw, 3rem)` for its title — so the contact row title genuinely renders smaller than "Our Vows".

- Define the full scale once in `src/index.css` as CSS variables (`--fs-eyebrow`, `--fs-title`, `--fs-subtitle`, `--fs-body`, `--fs-card-*`).
- Scale the shared title up so unification does not shrink anything: title tops out around 3rem instead of 2.6rem.
- Every row typography primitive (`RowTitle`, `RowSubtitle`, `RowBody`, `RowEyebrow`) reads the variables instead of inline `clamp()`.
- Strip one-off inline `fontSize` / `text-[NNpx]` from the front-end components that still carry them and route them through the scale or the existing `.text-card-*` utilities:
  `VowsSection`, `ServicesPillar`, `ContactSection`, `HeroSection`, `HeroRow`, `ServiceCard`, `TextRow`, `ServiceRow`, `GridRow`, `ProfileRow`, `ImageTextRow`, `ImageRow`, `QuoteBandRow`, `ProofBandRow`, `ProcessStepsRow`, `CellRenderer`, `ResourceWidget`, `CookieConsent`, `Footer`, `Navbar`.
- Result: contact, vows, boxed, service and grid rows all resolve to identical eyebrow / title / subtitle / body sizes at every viewport.

## 2. Row separators

Two separate things, both made obvious in the admin:

- **Shape edges** (curve / wave / arch / angled / taper / notch) already exist but are buried near the bottom of the row **Style** tab. Move them into a clearly labelled "Row edges & separator" group placed directly under Section band, with visual previews for top and bottom.
- **Hairline divider** — new per-row toggle: a thin top rule drawn in the border token, with an optional width choice (full-bleed or content-width). Stored on `row.layout` as `dividerTop`, defaults off, rendered by `RowSection`.

## 3. Page builder cleanup

**Stale content (confirmed by inspecting the saved draft):** the published homepage contains only hero, boxed and contact widgets, but the *draft* still holds two legacy `service` widgets carrying the old dark plum/gold colours — that is exactly what your screenshot shows. Services now live on their own `/services/:slug` pages.

- Remove the legacy service widgets from the homepage draft so the canvas matches the live light theme; the "Our Services" boxed row keeps linking out to the service pages.
- Clear leftover pre-light-theme colour overrides stored on remaining widgets/cells so rows fall back to the band tokens.

**Layout pass on all three panes:**

- *Left navigator*: consistent row height and indentation for the section list, larger tap targets, clearer active state, section count badge, quieter drag handles.
- *Right inspector*: uniform field rhythm (single spacing scale, one label style), grouped cards per concern (Content / Layout / Style / Advanced) with the rarely used groups collapsed, and sticky tab header so the tabs stay reachable while scrolling.
- *Canvas*: remove the letterboxing so the stage uses the full available width at 100% zoom, keeping the 24px safe zone; frame and shadow retained.

## Technical notes

- New tokens live in `src/index.css`; `tailwind.config.ts` gets matching `fontSize` entries so utilities and inline styles cannot drift again.
- `dividerTop` added to the row layout type in `src/types/rows.ts`, edited in `RowStyleTab.tsx`, rendered in `RowSection.tsx`.
- Draft cleanup runs as a one-off data update on the `page_rows` draft content; published content is untouched until you hit Publish.
- No colour or font-family changes — sizes, spacing and admin layout only.
