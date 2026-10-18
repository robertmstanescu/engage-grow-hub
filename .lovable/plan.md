# Remove all email sending and sign-ups; tidy the booking calendar

## What changes for visitors
- No newsletter sign-up boxes, "stay in the loop" or "keep me updated" wording anywhere on the site (rows, blog posts, footer).
- Free downloads (lead magnets) download directly, with no email asked for and nothing sent.
- The unsubscribe page is removed (it redirects to the home page).
- Contact = the Google booking calendar only (already done).

## Booking calendar
- The calendar shows at its full height, so there is no scroll bar inside the contact box (the page scrolls instead). Height is set per screen size so all slots and the booking form fit.
- The area behind the calendar is white, matching the contact box.
- Note: Google draws its own page inside the frame; if Google's form becomes taller than the space after picking a slot, a small inner scroll can still appear. I will size generously and check on phone and desktop.

## Admin
- The "Audience" section (Contacts and Campaigns) is removed from the admin menu; old links go to the dashboard.
- The "Add sign-up box" toggles in block editors and the Subscribe block are removed from the editor tray.
- Email-related settings disappear.

## Data (permanent, as requested)
- Delete the 2 stored contact messages, all lead records (currently 0), campaigns (currently 0), and the 43-entry email send log, plus unsubscribe tokens and suppressed addresses.
- Remove sign-up boxes and newsletter wording from the 2 pages and 1 site section that contain them (live and draft).
- Admin login emails (password reset, team invites) stay working.

## Technical details
- Code: delete `SubscribeWidget`, `widgets/subscribe`, `SubscribeToggle`, `EmailCampaigns`, `EmailBlockEditor`, `ContactsList`, `pages/Unsubscribe`, `services/contacts.ts`, `services/leads.ts`, `lib/mcp/tools/list-contacts.ts`; strip `subscribe` rendering from all rows; `ResourceWidget`/`LeadMagnetRow` become direct download links; remove `audience` from `navigation.ts` with `LEGACY_REDIRECTS` to overview; remove `contact_form`/`newsletter_signup` conversion kinds; update registry/blockFamilies/sectionLibrary/tests.
- ContactRow iframe: `scrolling="no"`, `overflow-hidden`, `bg-white` wrapper (via a token, e.g. `--card` / existing white surface token), heights ~1150px mobile / ~760px desktop, verified with Playwright.
- Edge functions deleted: `submit-contact`, `submit-lead`, `send-campaign`, `send-transactional-email`, `preview-transactional-email`, `process-email-queue`, `handle-email-unsubscribe`, `handle-email-suppression`. Keep `auth-email-hook` and `invite-admin`.
- Database: data deletes via SQL; tables left in place but marked deprecated (no schema drops), email queue cron disabled if present.
- Update ARCHITECTURE.md/CLAUDE.md notes and run `npm run check`.
