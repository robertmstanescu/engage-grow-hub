# Blend the blog cover image into the page mesh

## What's wrong

The cover image fade is painted as a coloured overlay that ends at the flat page background colour. But every page actually sits on the fixed gradient mesh (soft plum on the left, warm gold on the right). So at the bottom of the cover the overlay reaches a plain neutral colour while the surrounding page is tinted — which is exactly the seam visible on the right side of the screenshot.

## The fix

Stop covering the image with a colour and instead fade the image itself out:

- Remove the `linear-gradient(... background ...)` overlay layer on the cover hero.
- Apply a vertical mask to the image (`mask-image` / `-webkit-mask-image`) going from fully opaque at the top to fully transparent around the bottom third, with a soft mid stop so the transition is gradual.
- Result: the real page mesh shows through the bottom of the hero, so there is no colour seam on either side, at any viewport width.

Optionally keep a very light darkening tint only in the upper portion of the image if title legibility over bright covers needs it — that tint will stop well before the fade zone.

## Technical notes

Single file: `src/pages/BlogPost.tsx`, cover hero block. No changes to the mesh layer, header layout, or spacing.
