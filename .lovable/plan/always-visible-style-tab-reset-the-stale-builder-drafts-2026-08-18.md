# Always-visible Style tab + reset the stale builder drafts

Two fixes: make section styling (bands, edges, separators, backgrounds) reachable from a permanent **Style** tab in the right panel, and clear the outdated drafts so the Page Builder shows what is actually live.

## 1. A Style tab that is always there

Today the styling controls only appear when you select a whole row from the left navigator. When you click anything on the canvas you get a widget, and the right panel shows Content / Design / Advanced — no Style. That is why the new "Edges & separators" group is invisible.

Change the right panel to a single, consistent tab bar:

```text
Element Settings
┌────────────┬────────┬────────┬──────────┐
│  Content   │ Style  │ Design │ Advanced │
└────────────┴────────┴────────┴──────────┘
```

- **Content** — the selected widget's own editor (unchanged).
- **Style** — always edits the *section (row)* that contains the current selection: section band (Mesh / Auto / White / Tint / Deep), background colour and image, top separator line, top and bottom edge shapes, alignment, column widths, scroll snap.
- **Design** / **Advanced** — unchanged, per-widget spacing, colour, radius, visibility, custom CSS.

Details:
- A small header line inside Style names which row is being styled ("Styling section: Our Services") so it is clear the change is section-wide, not per-widget.
- Selecting a row directly (left navigator, or the row breadcrumb) opens the same Style tab — one place, one behaviour.
- When nothing is selected, Style shows a short hint pointing to page-wide settings instead of an empty panel.

## 2. Reset the outdated Page Builder drafts

The builder loads a saved draft, and the homepage draft is older than the live site: it still contains six rows including the two retired service rows ("Internal Communications" and "Employee Experience", now their own /services pages) plus old hardcoded purple text colours. The live page has four rows (Hero, Our Services, Vows, Contact). That mismatch is also what keeps the "unpublished changes" prompt on.

- Reset the saved drafts back to the published content for every section that currently has a stale one: **page_rows** (homepage rows), **navbar**, and **intro**.
- After this the builder opens on exactly the current live design and the "publish changes" badge is gone. Nothing on the public site changes.
- The retired service-row content stays available in version history if it is ever needed.

## Technical notes

- `WidgetInspectorTabs.tsx`: add a fourth `style` tab value, render `RowStyleTab` bound to the ancestor row resolved via `findWidgetLocation` (`pageRows[loc.rowIdx]`), patching with the existing row-level updater in `InspectorPanel`.
- `InspectorPanel.tsx`: route the `row:` branch through the same tab component with `style` preselected, so row and widget selections share one UI; keep the Danger zone below the tabs.
- `pickTabForFocusKey`: map row-level keys (`bandTone`, `shapeTop`, `shapeBottom`, `dividerTop`, `bgImage`) to the new `style` tab.
- Draft reset: a one-off SQL migration setting `draft_content = content` for `page_rows`, `navbar`, `intro` in `site_content`.
