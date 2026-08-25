# Complete the Admin UI Overhaul and Repair Scheduling

The previous rollout stopped after the blog editor and a handful of shared components. This pass completes the approved overhaul across the admin and makes scheduling one reliable, atomic workflow for Blogs, Pages, and homepage Rows.

## Confirmed gaps

- Only the Blog content editor uses `AdminPageHeader`, `AdminSection`, `AdminField`, and `AdminStickyBar`; Pages, Media, Contacts, Campaigns, Navigation, Tags, Redirects, SEO, Brand, Global settings, Team, and the builder shell still use their older screen patterns.
- CMS Pages, Blog page-structure editing, and homepage Rows still render the legacy `SchedulePublishPanel` rather than the approved shared status control.
- The new Blog status control saves `publish_at` / `expiry_at` independently, while the main Save action separately saves content and `status`. Choosing Scheduled therefore requires two saves in the correct order, and a new Blog cannot be scheduled until it has first been created. This is not the single scheduling workflow in the approved design.
- Scheduled fields are not loaded into the Blog editor's main form, so scheduling state is reconstructed indirectly after render rather than owned by one source of truth.
- No currently scheduled records exist in Blogs, Pages, or homepage Rows, while the scheduled-publishing job itself is running successfully every five minutes. The repair should focus on the editor flow, not replace the backend job.
- The admin token scope currently hardcodes an unrelated indigo/slate system and explicitly avoids the public-site palette. That conflicts with the approved requirement to match the site's current light brand design.
- Change-history descriptions are calculated only while rendering old snapshots; generated plain-English descriptions are not written to revision labels at save time as planned.
- The builder's existing legacy scheduler also causes the current React ref warning through `SiteSectionSchedulePanel`.

## 1. Repair scheduling first

- Make `AdminStatusControl` a controlled form component: it receives and reports `state`, `publishAt`, and `expiryAt`, and never writes to the database itself.
- Load all scheduling fields with the content record in Blog, CMS Page, Blog structure, and homepage Row editors.
- Save content, visibility, go-live time, and optional stop time together in one database update. This removes partial schedules and save-order dependencies.
- For a new Blog, allow Scheduled to be selected before first save; the first Save creates the Blog with its schedule in the same operation.
- Enforce the same rules everywhere: future go-live date required for Scheduled, stop date must follow go-live, Draft/Live clear obsolete schedule fields, and Live sets the expected publication date without re-stamping existing Blogs.
- Replace every `SchedulePublishPanel` / `SiteSectionSchedulePanel` usage with the repaired shared control, then remove the legacy components. This also eliminates the ref warning.
- Keep the existing five-minute publishing job and database schema unchanged.

## 2. Complete the shared admin screen system

Apply the approved screen skeleton to every top-level admin area:

- Header: clear page name, one-line purpose, and primary action.
- Content: consistent collapsible `AdminSection` groups and aligned `AdminField` controls.
- Actions: sticky save/action bar wherever a screen edits persistent data.
- Lists: one shared treatment for search, filters, empty states, rows, pagination, and destructive actions.
- Builder: retain the full-height three-pane canvas, but align its navigator, toolbar, inspector sections, scheduling, and history with the same light UI system.

Rollout covers Pages, Site Builder, Media, Contacts, Campaigns, Leads where surfaced, Navigation, Tags, Redirects, Analytics, SEO, Brand, Global settings, Team, and Version History—not only Blogs.

## 3. Match the site's actual light design

- Replace the hardcoded indigo/slate admin palette with admin-scoped semantic aliases derived from the existing light site brand tokens.
- Use Bricolage Grotesque for admin headings and the existing body font for controls; remove remaining Unbounded references from the system.
- Standardize compact radii, borders, shadows, focus rings, buttons, inputs, and selected states through tokens and shared component variants rather than per-screen inline colors.
- Preserve strong contrast and clear focus states while making the admin feel like the same product as the public site.

## 4. Finish plain-English naming

- Use the agreed vocabulary everywhere: Blogs, Rows, Live, Draft, Scheduled, Web address, Search title, Search description, and AI answer summary.
- Replace remaining technical IDs and raw URLs with content-derived names and friendly Preview/View live actions; retain raw URLs only in tooltips and copy-link actions.
- Use the centralized row-name helper in both builder navigators so labels describe their content rather than type codes.
- Generate a concise revision description when saving/publishing and persist it to `page_revisions.label`; retain calculated fallbacks for older revisions.
- Rewrite technical database errors into item-specific messages while keeping full details in the console for debugging.

## 5. Verification

- Add focused tests for schedule-state conversion, local/UTC date handling, validation, clearing schedules, first-save scheduling, and preserving an existing Blog publication date.
- Exercise Draft → Scheduled → Live → Draft for an existing Blog, new Blog, CMS Page, Blog structure, and homepage Row.
- Confirm each schedule writes content and timing together, appears correctly after reload, and is processed by the existing publishing job.
- Check every admin route at desktop and mobile widths for consistent headers, sections, controls, sticky actions, readable contrast, and no hardcoded dark/indigo remnants.
- Confirm the browser has no React ref warning and the production build passes.

## Technical notes

- Scheduling stays on the existing `status`, `publish_at`, `expiry_at`, live-content, and draft-content columns; no schema change is expected.
- Persistence remains in each editor's existing save service/adapter, while `AdminStatusControl` becomes presentation and validation only.
- Shared primitives remain under the existing admin UI module and are extended rather than duplicated.
