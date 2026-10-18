# Point "Book a discovery call" to the new booking link

- The "Book a discovery call" button in every contact section opens https://calendar.app.google/6MhwyESSZTtSbUrX8 in a new tab.
- The admin's "Booking page link" field is pre-filled with this new link.
- Any contact section that already has the old link saved gets the new one, on the live page and in the draft.
- Nothing else changes: the calendar on the page, emails and sign-ups stay as they are.

## Technical details
- `src/features/site/rows/ContactRow.tsx`: set `DEFAULT_BOOKING_URL` to the new link.
- Check `cms_pages`, `blog_posts` and `site_content` (live and draft) for a stored `booking_url` with the old link and replace it with the new one, if any is found.
