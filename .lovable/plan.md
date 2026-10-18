# Replace the contact email form with Google Calendar booking

## What visitors will see
- The contact section keeps its heading, intro text and note, but the form (name, email, message, newsletter tick) is gone.
- In its place: your Google booking calendar shown right on the page, so people pick a slot without leaving the site.
- Under it, a "Book a discovery call" button that opens your Google booking page (https://calendar.app.google/kyyVvzdka4GS5CPo8) in a new tab, for anyone who prefers a full page or whose browser blocks the embedded calendar.
- Works on phones: the calendar fills the width and is tall enough to use without awkward scrolling inside it.

## What you can edit in the admin (contact block)
- Booking link (pre-filled with your link above).
- Calendar embed link (pre-filled with your schedule link).
- Button text (default "Book a discovery call").
- Show calendar on page: on/off.
- The old form fields, success messages and newsletter options are removed from the editor.

## Other places
- Any "Book a call" / contact buttons in the menu or elsewhere that point to the contact form will be checked and pointed to the booking page where relevant.
- Existing contact sections on your pages switch automatically; no page content needs re-entering.
- Booking clicks are still counted as a conversion in your analytics.
- The old message-sending service stays in place but unused (nothing is deleted from your stored past messages).

## Technical details
- `src/features/site/rows/ContactRow.tsx`: drop form state/`submit-contact` call; render a lazy `iframe` (`loading="lazy"`, `title` for accessibility, responsive height ~700px desktop / taller on mobile) from `content.calendar_embed_url`, plus an external `<a>` styled `btn-ink` from `content.booking_url`, calling `trackConversion("booking_click")`. Defaults hard-coded to the user's URLs when content fields are empty.
- `src/features/widgets/contact/ContactAdmin.tsx`: replace field/success editors with booking URL, embed URL, button text and show-calendar toggle using shared `FieldComponents` (stays within the eight-field limit).
- Sanitize: only allow embed URLs starting with `https://calendar.google.com/`.
- Search `src` for `#contact` / booking CTAs and update targets as needed.
- Run `npm run check`; refresh visual baseline for the contact row (intentional design change).
