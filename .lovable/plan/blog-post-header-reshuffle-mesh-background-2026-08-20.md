# Blog post header reshuffle + mesh background

## Goal

Tighten the blog post page header layout and make the cover image sit inside the same page-mesh background used everywhere else.

## Changes

### 1. Reorder and compact the header metadata (`src/pages/BlogPost.tsx`)

Current order: back link → category+date → title → excerpt → tags → author.
New order from top to bottom:

- `<- ALL ARTICLES` back link (keep, but tighten spacing)
- Title
- Author and date on the same line (WE REMOVE THE BLOG CATEGORY FROM THIS VIEW)
- Tags
- Excerpt
- Then the article body

Reduce vertical gaps between these elements so the header feels like one tight block instead of scattered chunks.

### 2. Combine author and date on one line

Render the author avatar + name and the published date / read-time as a single horizontal meta row directly under the title. Remove the separate "Written by" label stack.

### 3. Make the cover image background the full page mesh

The cover image currently fades to `hsl(var(--background))`, which creates a solid band that hides the fixed `.page-mesh-layer`. Update the gradient overlay so it fades to transparent, letting the site's gradient mesh show through beneath the image and the header text. The image itself stays `aspect-video max-h-[70vh]`; only the fade target changes.

### 4. Preserve readability

Because the mesh will now be visible through the lower part of the cover, ensure the header text block has enough contrast by keeping it in the darker/lower zone of the gradient and using the existing foreground colour tokens.

## Files touched

- `src/pages/BlogPost.tsx` only.

## No database changes

The `excerpt`, `tags`, `author_name`, `author_image`, etc. fields are already queried and available.