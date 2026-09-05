# Cover images on rows — what works, what doesn't, and the fix

## What I checked

I audited the cover-image feature across the site renderers, all three admin editing surfaces, and the publish rules, and I queried the live content to see the real data shape.

## What already works

- Every row type that should have one **does** render the photo-card treatment when a cover image is set, and renders completely unchanged when it's empty: text, service, boxed, grid, lead magnet, testimonial, logo cloud, FAQ, proof band, process steps, quote band, CTA band, contact. The hero uses its own side visual instead, as intended.
- The fading banner spans the **full width** of the row's card, and its top corners match each row's own rounding (subtle / medium / dramatic), so it reads as one continuous card. The hero is intentionally excluded from this treatment.
- Cover images **are** saved and do reach the live site — the picture and its description are stored with the row's own content, so nothing extra was needed there.
- In the click-on-the-canvas editor (both the homepage editor and "Edit in Builder" on a page), the "Cover Image (optional)" picker with description box is present for every row type listed above, and the hero shows "Foreground Visual (optional)".

## What is genuinely broken

**1. The publish safety check never fires.**
The rule that blocks publishing when a picture has no description reads the old page format. Every live page is saved in the current nested format, so the check finds nothing to inspect and always passes. A row with an image and no description publishes silently today. This is the missing backend logic.

**2. The older list-style row editor is missing most row types.**
The plain list editor used for a blog post's "rows above/below content" (and the same list flow reached from the Pages screen) only offers editors for: hero, text, service, boxed, contact, image+text, profile, grid. Testimonial, logo cloud, FAQ, proof band, process steps, quote band, CTA band and lead magnet rows show **nothing at all** there — not just a missing cover field, no editor whatsoever.

**3. Duplicated editors.**
The text row and boxed row each have two separate editor implementations (one in the list editor file, one shared). Both happen to have the cover field today, but they will drift.

## The fix

1. Rewrite the publish check so it walks the current nested content format (reusing the existing helper the project already has for this), so it inspects every widget on the page regardless of which of the three historical formats a page was saved in. Keep it as a hard stop before anything is written, in all three publish flows (homepage, pages, blog posts).
2. Add a small test that a nested page with an image and no description is refused, and that a page with descriptions passes.
3. Point the list-style editor at the same shared per-row-type editors the canvas uses, so all row types (and their cover-image field) appear there too.
4. Delete the duplicated text/boxed editors in the list file in favour of the shared ones.
5. Verify in the browser: set a cover image on a couple of row types, confirm the card appears on the page, clear it and confirm the row looks exactly as before, and confirm publish is refused when a description is missing.

## About publishing to your domain

Preview updates as soon as changes are saved. Your custom domain only changes when you press Publish — I'll flag it when this work is ready to publish.

## Technical notes

- Root cause of (1): `findMissingAltViolations` in `src/services/contentAccessibility.ts` reads `row.type` / `row.content` on top-level rows. All `cms_pages.page_rows` are `schema_version: 3` (`rows[].columns[].cells[].widgets[]`), so `row.type` is undefined and `IMAGE_FIELDS_BY_TYPE` never matches. Fix by normalising with `normalizeRowsToV3` and iterating widgets (`type` + `data`), matching `src/lib/rowWidgets.ts` conventions.
- Callers to keep unchanged in behaviour: `SiteEditor.tsx:220`, `CmsPageBuilder.tsx:237`, `BlogPostBuilder.tsx:228` — all already early-return before the DB write.
- (2) is `renderRowEditorForContent` in `src/features/admin/site-editor/RowsManager.tsx:236` returning `null` in `default`; route it through the same switch used by `InspectorPanel.tsx:516` (or extract that switch into one shared module).
- (3) `TextRowFields` / `BoxedRowFields` inside `RowsManager.tsx` duplicate `site-editor/TextRowEditor.tsx` and `site-editor/BoxedRowEditor.tsx`.
