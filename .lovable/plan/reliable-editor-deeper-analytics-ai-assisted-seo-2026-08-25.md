# Reliable editor, deeper analytics, AI-assisted SEO

Four workstreams. They are independent and can ship in this order.

## 1. Replace the rich text editor with TipTap

The current editor is built on `document.execCommand` in a contentEditable div — a browser API that is deprecated and behaves differently per browser, which is why Italic and other buttons misfire. Patching it keeps the same class of bugs.

TipTap (ProseMirror underneath) is the reliable choice: it keeps its own document model and writes predictable HTML. TinyMCE is also solid but ships a large bundle, needs a licence key for the hosted build, and its output HTML is more verbose — TipTap fits this codebase and the "clean HTML I can read and edit" requirement better.

What ships:
- Toolbar parity with today: bold, italic, underline, strikethrough, headings, bullet/numbered lists, quote, link, image (media gallery picker), alignment, text colour, highlight, font size, undo/redo, clear formatting.
- Clean semantic output: `<p>`, `<strong>`, `<em>`, `<u>`, `<h2>`, `<ul>`, `<blockquote>`, `<a>` — no `<font>` tags, no stray nested spans.
- A **Source (HTML)** toggle: read and hand-edit the HTML, switch back and the editor parses it.
- Paste cleanup: pasting from Word/Docs/web strips junk markup and keeps structure.
- Existing saved content keeps rendering; legacy markup is normalised on first edit.
- Same props and save behaviour as today (`content` / `onChange`, debounced autosave), so every place using the editor keeps working with no call-site changes.

## 2. Per-page analytics on the Insights page

Today Insights only shows site-wide totals. Adding, from the data already collected in the analytics log:

- **Pages table** — one row per URL: views, unique visitors, average time on page, average scroll depth. Sortable, respects the existing date range and human/bot filter.
- **Traffic sources** — referring sites, search engines and AI assistants, and campaign sources, each with visits and unique visitors.
- **Multi-page readers** — how many visitors saw more than one page, average pages per visitor, and the most common page-to-page journeys.
- **Page drill-down** — clicking a page row opens its own view: that page's referrers, devices, countries, and a views-over-time trend.

Aggregation moves to database-side grouping so numbers stay correct as traffic grows (today's panels aggregate a capped sample in the browser).

## 3. AI Search Summary everywhere, not just blogs

The "Generate with AI" summary button currently only appears in the blog editor. It will be wired into the same SEO panel wherever it renders: CMS pages, the homepage SEO block, and the SEO Master table — with the page's own rows/content used as the AI's source material. A bulk "generate missing summaries" action in the SEO Master table so pages can be filled in one pass.

## 4. One-click AI SEO assistant

A **Generate SEO with AI** button at the top of the SEO panel (blog posts and pages). One call to Gemini 2.5 Flash Lite analyses the title and content and returns suggestions for:

- Meta description (≤160 chars)
- AI Search Summary (60–320 chars)
- Alt text for every image in the content, plus the OG image
- Suggested tags/categories (blog posts)

Suggestions appear in a review panel with **Accept** / **Reject** per field, so nothing is written until you approve it. Individual per-field AI buttons stay available (including a small one next to each image alt input).

On tags and SEO: tags help mainly through internal linking and topic clustering — category pages give search engines more entry points and signal what the site is about. They are not a direct ranking factor, so the plan treats them as navigation/structure value, not a magic SEO lever.

## Technical notes

- Editor: `@tiptap/react` + StarterKit and the extensions matching current toolbar features; existing `sanitizeHtml` stays as the save-time guard; `RichTextEditor.tsx` is rewritten behind its current interface.
- Analytics: new SQL aggregate functions over `unified_analytics_logs` (grouped by path, referrer, visitor), exposed as read-only RPCs restricted to admins; new panels in `AdminInsights.tsx` backed by helpers in `unifiedAnalytics.ts`.
- AI: extend the existing `generate-ai-summary` edge function (or add a sibling `generate-seo-suggestions`) to return a structured JSON object of all suggestion fields in one call, still on `google/gemini-2.5-flash-lite` through the built-in AI gateway; admin-only, same auth as today.
- SEO panel: `SeoFields.tsx` grows the suggestion review UI; `PagesManager.tsx`, `AdminDashboard.tsx` (homepage SEO) and `SeoMaster.tsx` pass their content source in.
