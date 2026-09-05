# Hero visual tidy-up, navbar alignment, blog spacing fixes

Four small presentation fixes, all frontend-only.

## 1. Hero foreground image: hide on mobile, remove sparkle badge

In `src/features/site/HeroSection.tsx`:

- **Hide the visual on mobile/tablet.** The `hasVisual` block currently renders stacked under the title on small screens (`mx-auto w-full max-w-sm`). Add `hidden xl:block` (matching the existing `xl:w-[340px]` desktop-only sizing) so the image only appears on wide screens beside the left-aligned text.
- **Remove the "sparkle circle".** Delete the decorative round badge (`lucide:Sparkles` icon in the floating circle overlapping the frame's top-right corner, lines ~578–591). The plain framed image remains.

## 2. Navbar: "Services" sits lower than the other links

In the desktop bar (`src/features/site/Navbar.tsx`), plain links are inline `<a>` elements while the Services dropdown link is `inline-flex` with a chevron icon — the mixed display modes break baseline alignment, so Services renders a few pixels lower.

Fix: give the links container uniform alignment (`flex items-center`) and make every top-level link `inline-flex items-center` with a consistent line-height, so labels and the chevron all share one baseline.

## 3. Blog categories panel: label/count layout

In `src/pages/Blog.tsx` `CategoryButton`, long category names wrap and push the count badge into odd positions (screenshot shows "People & HR Compliance" wrapping with the count floating mid-line).

Fix: make the label left-aligned with allowed wrapping and keep the count badge pinned to the top-right with a fixed gap (`items-start` / `flex-shrink-0` on the count, `text-left` on the label).

## 4. Blog: gap between header text and first post is too big

The blog page stacks `pt-36 pb-16` on the header section and `py-20` on the posts section, creating an oversized gap between the subtitle and the first card.

Fix: tighten the header's bottom padding and the posts section's top padding (e.g. header `pb-8`, posts section `pt-6` on `/blog/`) so the first article sits at a comfortable distance under the intro text.

## Verification

- Playwright at desktop width: navbar labels on one line, hero image + no sparkle badge, blog gap and categories panel.
- Playwright at mobile width: hero shows text only (no image).
- Typecheck after edits.
