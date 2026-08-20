# Blog upgrades: covers, cards, paging and categories

## 1. Cover image is cropped on the post page
Today the post header renders the cover in a fixed 256–384px tall band with `object-cover`, so an HD landscape photo gets cut top and bottom.

Fix: render the cover at its natural landscape aspect ratio (16:9), full container width, capped so it never exceeds ~70% of the viewport height. Nothing is cropped; the existing fade into the page stays.

## 2. Author avatar from the media gallery
The author image field is a bare upload button. Replace it with the same gallery-backed picker used everywhere else in admin (upload, pick from gallery, or paste URL) plus the standard alt-text input. The cover image field gets the same treatment for consistency.

## 3. Paragraph spacing in body text
Rich-text paragraphs currently get inconsistent top/bottom spacing depending on context. Standardise on 8px top and bottom margin for every paragraph in all long-form body text (row bodies, blog article body, prose blocks) so every paragraph has clear, even breathing room.

## 4. Excerpt and tags everywhere
- `/blog` cards: show excerpt (already there) plus the post's tags as pills, using the existing tag colour system.
- Post page: show tags under the header, next to category/date.

## 5. `/blog` cards become cover-image cards
Each card renders the post's cover image as its background with a darkening gradient overlay; the existing text (category, date, read time, title, excerpt, tags) sits on top. The overlay strength adapts and the text colour flips light/dark automatically using the project's existing foreground-picking helper, so pale covers still read correctly. Posts without a cover keep the current glass card look.

## 6. Page mesh behind the blog list
The blog listing section currently paints a solid background, hiding the page mesh. Make it transparent so the site-wide mesh shows through, matching the rest of the site.

## 7. Pagination — 5 posts per page
Show 5 posts per page with previous/next and numbered controls. Page state lives in the URL (`?page=2`) so it is shareable and back-button friendly. Pagination resets when the category filter changes.

## 8. Category filter rail on the right
A sidebar on the right (stacks above the list on mobile) lists every category that has published posts, plus "All". Selecting one filters the list and is reflected in the URL (`?category=...`). Selected category renders at full brightness/weight; unselected ones dim, matching the "brighter selected, dimmer rest" behaviour requested.

## Technical notes
- Files touched: `src/pages/Blog.tsx`, `src/pages/BlogPost.tsx`, `src/features/admin/BlogEditor.tsx` (swap in `ImagePickerField`), `src/index.css` (paragraph rhythm), `src/features/site/rows/typography/RowBody.tsx`.
- Contrast handling reuses `src/lib/pickForeground.ts`; tag/category colours reuse `useTagColors`.
- Filtering and paging are client-side over the already-fetched published posts — no schema or query changes needed.
- No database migrations required.
