# Fix About Us bullets and body alignment

## What will change

1. **Restore bullet and numbered lists in every row body**
   - Route the Profile and Image & Text body content through the shared row-body treatment, or add the same semantic body marker where their editable wrapper must remain.
   - Keep the existing rich-text content and styling intact while ensuring unordered and ordered lists receive visible markers, indentation, and nested-list styling on both the live page and admin canvas.

2. **Make cross-column body alignment use the real body line**
   - Add the shared `body` semantic marker to the legacy Text, Image & Text, Profile, Boxed, Service, Grid, and other applicable row renderers that currently expose body copy without it.
   - Refine the alignment fallback so that when one widget has an eyebrow/title and the neighbouring widget has only body copy, that body begins level with the first widget’s body—not at the top of the row.
   - Preserve natural top alignment only when both sides have neither an eyebrow nor a title, as previously agreed.

3. **Prevent regressions**
   - Add focused tests for a titled widget beside a body-only widget and for two widgets with no heading structure.
   - Verify the About Us page at desktop and mobile widths, checking visible bullet markers and comparing the two body start positions after fonts have loaded.

## Technical scope

Frontend rendering and tests only. No content, colour, typography, or database changes.
