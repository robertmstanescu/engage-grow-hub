# Blog post page visual fixes

## Problems (from screenshot)
1. The blog post header (back link, category, title, author) sits on a solid grain band that does not visually connect to the cover image; the cover stops above the header instead of bleeding into it.
2. There is too much empty space between the title/author block and the article body; the excerpt should live in that gap.
3. Tags are currently under the title; they should move under the excerpt, just before the body.
4. The header area should overlap the cover image a bit more so the hero feels continuous.

## Proposed changes

### `src/pages/BlogPost.tsx`
- Wrap the cover image and header in one relative container so the header can be positioned over the bottom of the cover.
- Increase the cover gradient fade so it blends into the page mesh / transparent header, not into a solid band. The gradient should start fully transparent higher up and transition to a light/dark scrim that still lets the mesh show through.
- Remove the `grain` and `section-light` solid backgrounds from the header and the top of the body so the page-wide mesh gradient remains visible.
- Add the `excerpt` under the title with appropriate spacing.
- Reorder metadata: title → excerpt → tags → author/date/read-time line.
- Tighten vertical spacing between the header block and the article body.

### `src/pages/Blog.tsx` (quick consistency pass)
- Confirm the floating shadow on cover-image cards is still present; no other changes needed for this request.

### `src/index.css`
- If a helper class is needed for the mesh-transparent post header, add it; otherwise rely on existing background utilities.

## Acceptance criteria
- Cover image visually extends under the title/back-link area.
- Header background reads as the page mesh, not a separate solid panel.
- Excerpt appears between the title and the tags.
- Tags appear directly under the excerpt, before the author line and body.
- Vertical gap between header metadata and first body paragraph is noticeably smaller.
