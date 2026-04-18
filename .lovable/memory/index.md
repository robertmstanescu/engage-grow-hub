# Memory: index.md
Updated: just now

# Project Memory

## Core
- Stack: React + Tailwind CSS. Supabase Auth with RLS (`public.is_admin()`).
- Aesthetic: 'Bold & Provocative / Dark Luxury', 'liquid glass', Unbounded font titles.
- CSS color variables MUST use HSL channel format (e.g., `--primary: 280 55% 24%`).
- Canonical: Non-www `https://themagiccoffin.com` with trailing slashes enforced.
- Admin inputs MUST use deferred saving (`useDeferredValue`) committing on `onBlur` or `Enter`.
- Admin preview: 'Preview live' opens in NEW TAB. NO iframe-based real-time preview.
- Spacing: 5px spacing before/after every paragraph globally.
- Folders: admin → `src/features/admin`, site → `src/features/site`, backend/helpers → `src/services`, primitives → `src/components/ui`. `src/lib/utils.ts` stays for shadcn.
- Image alt text: every admin image picker exposes a 100-char `ImageAltInput`; frontend `<img>` uses `resolveImageAlt()` with descriptive fallbacks.
- Storage buckets `editor-images` & `row-overlays` serve individual files publicly but listing is admin-only. HIBP password protection enabled.
- Typography: TIERED — HeroRow keeps oversized fluid title; all other rows use shared `<RowEyebrow/RowTitle/RowSubtitle/RowBody/RowSection>` wrappers from `src/features/site/rows/typography/`. Body text uses `leading-[1.6]` (WCAG 1.4.12). Per-row color overrides preserved.
- Spacing rhythm: use `mb-rhythm-tight` (12px), `mb-rhythm-base` (24px), `mb-rhythm-loose` (48px), `py-row` / `py-row-md` from tailwind.config. All rows share same vertical padding via `<RowSection>`.
- Interactive states: use `.interactive` (or `.interactive-strong`) utility class from index.css for buttons/links — no more ad-hoc `transition-all duration-500 hover:opacity-85` strings.

## Memories
- [Folder structure](mem://architecture/folder-structure) — features/admin, features/site, services, components/ui layout
- [UI Design Patterns](mem://ui/design-patterns) — Space-saving UI, fade transitions for carousels, CSS grid for accordions
- [Color Format](mem://style/color-format) — CSS color variables must use HSL channel format
- [Mobile & Tablet Nav](mem://ui/mobile-tablet-navigation) — Hamburger menu at lg/1024px, hidden booking button, protected logo
- [Contact Form Config](mem://features/contact-form) — Two-column layout, liquid glass styling, edge function processing
- [Rich Text Editor](mem://tech/rich-text-editor) — Formatting tools, Drop Caps styling, source view, dynamic background
- [Email Marketing](mem://features/email-marketing) — notify.themagiccoffin.com, send-transactional-email edge function Auth
- [Tags & Categories](mem://features/tags-categories) — Admin tab for custom tags, customizable colors, centralized hook styling
- [Navigation Arch](mem://architecture/navigation) — Left-rail desktop nav, rotated text, dynamic logo switching
- [Security Policies](mem://auth/security) — Supabase RLS, public signups disabled, blocklisted CMS slugs, HIBP, admin-only bucket listing
- [Security Hardening](mem://tech/security-hardening) — DOMPurify configuration allows 'style' and 'class' attributes
- [Admin Edit Mode](mem://features/admin-edit-mode) — Live site floating toolbar, Select Mode, EditableText onBlur save
- [Newsletter Sub](mem://features/newsletter-subscription) — Toggleable widget, inherits parent alignment, uses submit-contact
- [SEO & AI Discovery](mem://seo/ai-discovery) — React SPA noscript fallback, per-page metadata, structured data
- [Brand Identity](mem://brand/identity) — Dark luxury, liquid glass, Unbounded font, fluid hero typography
- [Tech Stack](mem://tech/stack) — React, Tailwind, Framer Motion (complex), useScrollReveal hook
- [Page Builder](mem://architecture/page-builder) — Multi-column layouts, standard fields, 5px paragraph spacing
- [Scroll Animations](mem://ui/animations) — Desktop vs Mobile reveal animation specs and performance tuning
- [Media Gallery](mem://features/media-gallery) — List-view gallery interface and direct upload capabilities
- [Service Row Styling](mem://features/service-row-styling) — Container dimensions, internal alignment inheritance, color controls
- [Layout Logic](mem://ui/layout-logic) — useAutoFitText hook for RTE body text on desktop
- [Technical SEO](mem://seo/technical-seo) — Non-www canonical domain, trailing slashes, usePageMeta hook
- [Global Brand Settings](mem://brand/settings) — Database-persisted global CSS variables for UI defaults
- [Page Management](mem://features/page-management) — Draft/Publish lifecycle, Custom Pages inheritance
- [Footer & Settings](mem://features/global-settings-footer) — Footer columns, high-contrast admin inputs, deferred saving
- [Admin Dashboard](mem://features/admin-dashboard-architecture) — 3-panel layout, full-width properties, no iframe preview
- [Grid Row Layout](mem://features/grid-row-architecture) — 3-zone architecture, Stats Block, Achievement Grid
- [Image & Text Masks](mem://features/image-text-row-shapes) — Customizable split ratios, specialized clip-path masks, floating caption
- [Profile Row Layout](mem://features/profile-row-styling) — Glass border image, hero-style titles, vertical text alignment
- [Typography System](mem://design/typography-system) — Tiered scale, RowEyebrow/RowTitle/RowSubtitle/RowBody/RowSection wrappers, 1.6 line-height
