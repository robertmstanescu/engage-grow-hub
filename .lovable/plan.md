# Fix washed-out admin highlights and icons

## What's wrong

The admin panel reuses the public site's `--secondary` token as its accent color. Since the light-theme overhaul, `--secondary` is a pale violet **surface** color (`285 38% 94%`), so everything painted with it — the active sidebar item, section titles like "Brand Settings" and "Media Library", chevrons, badges, toggle icons — renders near-white on a near-white background. That is the highlight/icon problem in the screenshots, not a per-component styling bug.

There is also leftover hardcoded color in the admin shell: inline `hsl(30 20% 96%)` page backgrounds on the admin route wrappers and hardcoded `#FFFFFF` / `#1a1a1a` inputs in the tags manager.

## The fix

1. **Give the admin its own accent tokens.** Inside the `.admin-light` scope, redefine `--secondary` / `--secondary-foreground` to the readable admin indigo already used for primary actions, so every existing `text-secondary`, `bg-secondary/10`, `border-secondary` usage in the admin instantly becomes legible without touching each file. Public-site rows are unaffected because they never render inside `.admin-light`.
2. **Strengthen the active sidebar state** so the selected item reads clearly: solid indigo tint background, indigo-700 label and icon, 2px left border.
3. **Remove hardcoded colors** in admin shell files:
   - Inline `backgroundColor: "hsl(30 20% 96%)"` on `Admin.tsx`, `AdminProfile.tsx`, `AdminInsights.tsx` → `bg-background`.
   - Hardcoded `#FFFFFF` / `#1a1a1a` input styles in `TagsManager.tsx` → `bg-card text-foreground` tokens. (The hex values users pick for tag colors stay as data — those are content, not theme.)
4. **Sweep the remaining admin files** (`SeoMaster`, `MediaGallery`, `VersionHistory`, `AdminOverviewDashboard`, `RevisionHistoryPanel`, `BlogEditor`, editor tabs) for any other light-on-light pairing and switch them to foreground/muted-foreground tokens where the accent isn't meaningful.
5. **Verify** with screenshots of the dashboard, brand settings and media library at desktop width, checking the active nav item, headings and icons all read clearly.

## Technical notes

- All changes are scoped under `.admin-light` in `src/index.css` plus the token swaps listed above; no public-site tokens change.
- No database or backend changes.
