# Blog cover back to the top, and a crop tool that works

## 1. Article cover starts at the very top again

On an article page the photo now begins below a blank band, because the article was pushed
down to clear the floating menu bar. The photo will go back to starting at the very top of
the screen, with the menu bar floating over it, and the title continuing to sit over the
lower, faded part of the picture as before.

Articles without a cover photo keep their current comfortable top spacing, so the title
never hides behind the menu.

## 2. "Crop" no longer fails with a browser error

Cropping currently stops with "Tainted canvas may not be exported". This happens because
the picture inside the crop window is loaded straight from the image address, which the
browser then refuses to let us save a copy of.

Fix: the crop window will first download the picture itself and work from that local copy,
so cutting and saving always succeeds. If the download ever fails, a plain message explains
it instead of the technical browser error. Everything else about cropping (the shape
buttons, the drag box, "Crop & upload") stays the same.

## Technical notes

- `src/pages/BlogPost.tsx`: drop `pt-24 md:pt-28` from the `<article>` when `cover_image`
  is set (apply it only in the no-cover case). Keep the existing `-mt-24 md:-mt-32` header
  overlap and the `max-h-[70vh]` clamp on `CoverFadeImage`.
- `src/features/admin/ImagePickerField.tsx`: in the crop modal, resolve `imageUrl` through
  `fetch(url).then(r => r.blob())` → `URL.createObjectURL` and use that as the `<img src>`
  (revoke on unmount); fall back to `crossOrigin="anonymous"` if the fetch is blocked.
  `applyCrop` then draws from an untainted image and `canvas.toBlob` works. Wrap the fetch
  in try/catch with a friendly toast.
- No content, colour, or database changes.
