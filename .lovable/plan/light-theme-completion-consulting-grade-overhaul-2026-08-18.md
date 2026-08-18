# Light Theme Completion + Consulting-Grade Overhaul

Finish the light redesign so nothing dark-era is left behind, widen the navigation, calm the motion, and reduce admin complexity.

## 1. Text and colour: full light-mode pass

Everything currently readable only because it sits on a dark background gets re-toned to the plum/ink foreground.

- Public site: sweep every remaining hardcoded colour (white text, cream `#F9F0C1`, `rgb(255,255,255)`, dark overlays) out of the row components, hero, footer, contact, service cards and widgets. All colour comes from semantic tokens only.
- Cookie consent card: currently a dark plum toast. Rebuild as a white card with plum text, gold accept button, dark outline secondary button, matching the site card styling.
- Admin: retone the dashboard shell, sidebar, inspector, toolbar and modal overlays to the light palette. Replace hardcoded hexes in Tags manager and email block editor defaults with tokens; keep the colour-picker swatches (those are user data).
- Icons: default icon colour becomes the plum ink, gold reserved for accents. Applies to nav, cards, footer, admin.
- Rows still carrying dark custom gradients saved in the editor get their stored stops migrated to light equivalents so no section stays dark by accident.
- You may remove Unbounded as a font.

## 2. Logo

- Site pulls the dark logo and dark emblem from Brand settings (media library) wherever the background is light: navbar, footer, favicon-adjacent uses.
- Fallback: when no dark asset is set, apply an automatic invert/darken filter to the light asset so the logo is never pale-on-pale.

## 3. Navigation bar

- Floating pill widened to ~90% of the viewport, with a comfortable max width so it stays balanced on very wide screens.
- Contents laid out as: dark logo left, links centred, Contact button right — with enough padding that nothing crowds or wraps.
- Links get consistent spacing and a clear active state; the whole bar sits on a light translucent surface with a soft border and shadow.
- Mobile/tablet keeps the same pill proportions with the hamburger.

## 4. Motion: strip to "expensive quiet"

Remove the accumulated animation machinery: the navbar entrance cascade, hero cascade, scroll-reveal hook, momentum snapping and inspector flash. Replace with a single restrained system:

- One soft fade-and-rise on first paint for the hero block only, ~500ms, no stagger chains.
- Hover and focus transitions at 200ms on links, buttons and cards (subtle lift on cards, colour shift on links).
- Smooth scrolling for anchor links only.
- Full `prefers-reduced-motion` respect.

Nothing else moves. Restraint is what reads as premium.

## 5. Consulting-site recommendations (proposed, implement on your say-so)

Structural moves that would sharpen the page as a consulting business site:

- **Proof band** under the hero: client logos or a one-line credibility statement. Consulting buyers scan for evidence before reading copy.
- **Outcome-led service cards**: lead each card with the result ("Comms people actually read"), not the deliverable name. Deliverables move into the accordion.
- **A process strip**: three or four numbered steps showing how an engagement runs. Removes the biggest hesitation — "what does working with you look like".
- **One testimonial or case snippet** per pillar rather than a separate testimonial section.
- **Single persistent CTA**: one booking action repeated, not competing buttons.
- **Generous whitespace and a strict type scale** — two heading sizes, one body size. Crispness comes from consistency, not variety.

## 6. Admin: reduce options, smart defaults

- Every row inspector splits into **Content** (always visible: text, images, links) and **Advanced** (collapsed by default: colours, gradients, spacing, snapping, custom classes).
- New rows inherit global brand defaults instead of exposing per-row colour pickers up front, so the standard flow is type-and-save.
- Plain-language labels replace technical field names.
- Style fields that are now handled globally (per-row background gradients, per-row padding) get demoted into Advanced with a "using brand default" indicator.

## Technical notes

- Colour work is token-only in `src/index.css`; components reference `--foreground`, `--primary`, `--accent`, `--card` and the `surface-card` utility. No new hex values in TSX.
- Animation cleanup removes the cascade keyframes and the scroll-reveal/momentum-snap hooks and their call sites; the snap-container scroll behaviour reverts to normal document flow.
- Logo fallback is a CSS filter applied only when the dark asset field is empty.
- Stored dark gradients are migrated with a database update on the page-content rows; existing content text is untouched apart from colour values.