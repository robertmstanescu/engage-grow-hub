# Services dropdown in the navbar

Today all four service pages sit as separate top-level items, which crowds the bar. This groups them under a single "Services" dropdown that is itself a link to the Services page, and puts Blog right after Our Vows.

## Target navbar

```text
[logo]   About us   Services ▾   Our Vows   Blog        [Contact]
                     ├ Internal Communications
                     ├ Employee Experience
                     ├ People Operations
                     └ Fractional HRBP
```

- Clicking "Services" navigates to `/services/` (the existing published Services page).
- Hovering (or keyboard focus / click on touch) opens the panel with the four service links.
- Mobile menu: "Services" shows as a group heading that links to the page, with the four sub-items indented underneath.
- Blog becomes a normal ordered nav item so it can sit exactly after Our Vows.

## Backend / data

The `navbar` record already has `sub_links`, `services_label` and `show_blog_link`; they are just not used as a dropdown today (`sub_links` is flattened into the top row and Blog is always appended last).

Data changes to the `navbar` site_content row:
- `services_label`: "Services"
- `services_href`: `/services/` (new field, so the dropdown parent is clickable)
- `sub_links`: the four service links, moved out of `links`
- `links`: About us, Our Vows, Blog (`/blog/`)
- `services_index`: position where the dropdown is injected into `links` (default 1, i.e. after About us)
- `show_blog_link` set to false since Blog is now an explicit link

Both `content` and `draft_content` get the same shape so live and draft stay in sync.

## Admin (Navigation Manager)

- "Services Dropdown" section gains a **Dropdown link** field (page picker + custom) and a **Position in nav** selector.
- Existing drag-and-drop for dropdown items and main links stays as is.
- The same fields are mirrored in the site-editor `NavbarEditor` so both editing surfaces match.
- Blog is edited like any other link (the old "Show Blog link" checkbox is removed to avoid two sources of truth).

## Technical notes

- `src/features/site/Navbar.tsx`: build the item list as `links` with a `{ kind: "dropdown" }` entry spliced in at `services_index`; render it with a hover/focus popover (Framer Motion fade, existing card/blur/shadow tokens), `aria-expanded`, Escape to close, and active state when the route is `/services` or any `/services/*`.
- `src/features/admin/NavigationManager.tsx` and `src/features/admin/site-editor/NavbarEditor.tsx`: new fields.
- Mobile overlay renders the group inline; no dropdown behaviour needed.
- Data update runs as a data write to `site_content`; no schema migration required.
