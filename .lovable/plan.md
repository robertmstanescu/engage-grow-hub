# Booking-only contact: new link, tidy calendar, remove all email sending and sign-ups

## Booking button and calendar
- "Book a discovery call" opens https://calendar.app.google/6MhwyESSZTtSbUrX8 in a new tab, in every contact section. The admin's "Booking page link" field is pre-filled with it, and any old link already saved is replaced (live and draft).
- The calendar shows at its full height, so there is no scroll bar inside the contact box (the page scrolls instead). Height is set per screen size so all slots fit.
- The area behind the calendar is white, matching the contact box.
- Note: Google draws its own page inside the frame; if its form grows after picking a slot, a small inner scroll may still appear. I will size generously and check on phone and desktop.

## What changes for visitors
- No newsletter sign-up boxes, "stay in the loop" or "keep me updated" wording anywhere on the site (rows, blog posts, footer).
- Free downloads (lead magnets) download directly, with no email asked for and nothing sent.
- The unsubscribe page is removed (it redirects to the home page).

## Admin
- The "Audience" section (Contacts and Campaigns) is removed from the admin menu; old links go to the dashboard.
- The "Add sign-up box" toggles in block editors and the Subscribe block are removed from the editor tray.

## Data (permanent, as requested)
- Delete the 2 stored contact messages, all lead records (currently 0), campaigns (currently 0), the 43-entry email send log, unsubscribe tokens and suppressed addresses.
- Remove sign-up boxes and newsletter wording from the 2 pages and 1 site section that contain them (live and draft).
- Admin login emails (password reset, team invites) keep working.

## Technical details
- `ContactRow.tsx`: `DEFAULT_BOOKING_URL` = new link; iframe `scrolling="no"`, `overflow-hidden`, white wrapper via token, heights ~1150px mobile / ~760px desktop, verified with Playwright. SQL-replace any stored `booking_url` with the old link.
- Code: delete `SubscribeWidget`, `widgets/subscribe`, `SubscribeToggle`, `EmailCampaigns`, `EmailBlockEditor`, `ContactsList`, `pages/Unsubscribe`, `services/contacts.ts`, `services/leads.ts`, `lib/mcp/tools/list-contacts.ts`; strip `subscribe` rendering from all rows; `ResourceWidget`/`LeadMagnetRow` become direct download links; remove `audience` from `navigation.ts` with `LEGACY_REDIRECTS` to overview; remove `contact_form`/`newsletter_signup` conversion kinds; update registry/blockFamilies/sectionLibrary/tests.
- Edge functions deleted: `submit-contact`, `submit-lead`, `send-campaign`, `send-transactional-email`, `preview-transactional-email`, `process-email-queue`, `handle-email-unsubscribe`, `handle-email-suppression`. Keep `auth-email-hook` and `invite-admin`.
- Database: data deletes via SQL; tables left in place but marked deprecated (no schema drops); email queue cron unscheduled if present.
- Update ARCHITECTURE.md/CLAUDE.md and run `npm run check`.
