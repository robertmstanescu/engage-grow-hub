# Admin Panel UI Overhaul

A full redesign of the admin experience: one refreshed light visual language, a consistent screen skeleton across every admin page, and ergonomics fixes where the interface currently fights you (sticky editor toolbar, one-line scheduling, clearer grouping). No fields are removed — everything stays visible, just organised so importance is obvious at a glance.

## Principles

- Keep every existing control. Group and rank them instead of hiding them.
- One visual language: same header, same section cards, same save bar, same buttons everywhere.
- Light theme only, built from the existing brand tokens (plum primary, Unbounded titles) so admin feels like the site without copying its dark-luxury drama.
- Anything you act on repeatedly (formatting, save, publish) must always be reachable without scrolling.

## 1. Admin design refresh (light)

- Add an admin-scoped token layer under `.admin-light`: refreshed surfaces (page background, card, subtle border), a tighter type scale, one accent, and consistent radius/shadow steps.
- Standard primitives reused by every screen:
  - `AdminPageHeader` — title, short description, primary action, breadcrumb.
  - `AdminSection` — a titled card with optional description; the single container for grouped fields.
  - `AdminField` — label + control + helper/error, so all inputs align identically.
  - `AdminStickyBar` — bottom save/publish bar with status ("Saved 2 min ago", unsaved-changes dot).
- Buttons/inputs/selects/toggles get one set of styles; the ad-hoc inline styling scattered through admin files is replaced with these classes.

## 2. Screen skeleton

- Sidebar navigation regrouped into labelled groups: **Content** (Site, Pages, Blog, Media), **Audience** (Contacts, Campaigns, Leads), **Structure** (Navigation, Tags, Redirects), **Insights** (Analytics, SEO), **Settings** (Brand, Global, Team).
- Every screen renders as: header → content → sticky action bar. Same on Blog, Pages, Site Editor, Settings, Media.
- The site editor keeps its three-column builder, restyled to the new tokens with clearer column headers and a full-height canvas.

## 3. Blog / page editor ergonomics

- **Sticky formatting toolbar**: the rich-text toolbar pins to the top of the editing area while you scroll the body, so selecting text deep in an article never requires scrolling back up. It also collapses overflow controls into a compact "more" group on narrow widths.
- Editor body gets a comfortable measure and larger writing type — it should feel like writing, not filling a form.
- Fields regrouped into four visible sections in a right column (each open by default, collapsible by choice):
  1. **Publishing** — status, schedule, author, categories/tags.
  2. **Presentation** — cover image + alt, excerpt.
  3. **SEO & AI** — meta title/description, AI summary, slug, plus the existing "Generate all SEO with AI" panel.
  4. **Advanced** — page structure mode, revisions, expiry.
- Sticky save bar replaces the buried save buttons; keyboard `Cmd/Ctrl+S` saves.

## 4. Scheduling, simplified

Replace the current multi-field schedule panel with a single status control:

```text
Status:  ( ) Draft   ( ) Published   (•) Scheduled
         └─ Goes live:  [ 12 Sep 2026, 09:00 ]   your timezone
            Auto-unpublish (optional)  ▸
```

- One row of choices instead of a panel of timestamps.
- The date-time field only appears when **Scheduled** is chosen.
- Expiry becomes a small optional disclosure under it — still there, no longer competing for attention.
- Confirmation reads in plain language: "Goes live Saturday 12 Sep at 09:00."
- Same control used for blog posts, CMS pages and site sections, so scheduling behaves identically everywhere.

## 5. Rollout order

1. Token layer + shared primitives.
2. Blog editor (sticky toolbar, grouping, new scheduler) — the screen you hit most.
3. Pages manager + site editor shell.
4. Media, Contacts, Campaigns, Tags, Redirects, Navigation.
5. SEO Master, Insights, Brand/Global/Team settings.

## Technical notes

- New files: `src/features/admin/ui/` for `AdminPageHeader`, `AdminSection`, `AdminField`, `AdminStickyBar`, `AdminStatusControl`.
- Admin tokens added under the existing `.admin-light` scope in `src/index.css` (HSL channel format), so public-site styling is untouched.
- Sticky toolbar implemented inside `RichTextEditor.tsx` via a `position: sticky` toolbar wrapper plus a scroll container on the editor shell — no editor engine change; TipTap stays.
- `AdminStatusControl` wraps the existing `publish_at` / `expiry_at` persistence in `SchedulePublishPanel.tsx` and `SiteSectionSchedulePanel.tsx`; database schema and the 5-minute publish cron stay as they are.
- Data flow, saving semantics, RLS and edge functions are unchanged — this is presentation-layer work.
