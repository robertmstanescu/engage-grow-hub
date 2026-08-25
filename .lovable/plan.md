# Replace the remaining legacy text editor

## Confirmed issue

The main rich body field already imports the new TipTap editor, but page titles still use `TitleLineEditor`, a separate legacy `contentEditable` implementation powered by deprecated `document.execCommand`. On the current page-builder route, title fields therefore still look and behave like the old editor, and that editor does not expose a reliable italic command.

## Plan

1. **Use one editor engine everywhere**
   - Extend the existing open-source TipTap editor with a compact, single-line/title mode.
   - Replace `TitleLineEditor`’s browser `execCommand` implementation with that TipTap mode while preserving its current props, deferred-save behaviour, background-aware contrast, font, size, and colour controls.
   - Keep title fields constrained to title-safe formatting and prevent accidental multi-paragraph content.

2. **Make formatting reliable**
   - Add Bold, Italic, Underline, and Clear Formatting controls to title mode.
   - Preserve selection when clicking toolbar controls and serialize italic as clean semantic `<em>` markup.
   - Ensure existing title HTML is parsed without losing legacy font, size, colour, or drop-cap-compatible markup.

3. **Verify every editor surface**
   - Check page-builder titles and body fields, blog content, CMS page content, widgets, and email content.
   - Test selection-based italic toggling, saving, reopening, HTML source editing for full rich text, and public rendering.
   - Add focused editor tests for semantic HTML output and formatting persistence.

## Technical choice

Keep **TipTap** rather than introducing a second new dependency. It is already installed, open source, outputs readable semantic HTML, and supports the required media-gallery and HTML-source integrations. **Lexical** is also free and capable, but replacing the completed TipTap body editor would add migration work without fixing the actual cause: the page-builder title fields still bypass TipTap. CKEditor 5 has a more restrictive GPL/commercial licensing model and is not the best fit here.
