"""
Crop the owner's library photos into Work covers.

    python3 scripts/work-portfolio/make-covers.py <manifest.json> <library dir> <public dir>

Each cover is 1600x1200 (4:3), WebP, under 400 KB (portfolio doc sizes).
The crop is centred, moved up or down by the entry's optional focusY
(0 = top, 1 = bottom). Exits non-zero if a source is missing or a file
ends up too large, so a broken cover never ships quietly.
"""
import json
import os
import sys

from PIL import Image, ImageOps

W, H, MAX_BYTES = 1600, 1200, 400_000


def crop_to(im: Image.Image, w: int, h: int, focus_y: float) -> Image.Image:
    """Scale to cover w x h, then crop; focus_y picks the vertical window."""
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = (im.width - w) // 2
    top = round((im.height - h) * focus_y)
    return im.crop((left, top, left + w, top + h))


def save_webp(im: Image.Image, path: str) -> int:
    """Save at falling quality until the file fits the budget."""
    for q in (78, 72, 66, 60, 54):
        im.save(path, "WEBP", quality=q, method=6)
        size = os.path.getsize(path)
        if size <= MAX_BYTES:
            return size
    raise SystemExit(f"{path} is still {size} bytes at quality 54")


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    manifest_path, library, public = sys.argv[1:]
    entries = json.load(open(manifest_path, encoding="utf8"))
    for e in entries:
        src = os.path.join(library, e["cover"]["source"])
        if not os.path.isfile(src):
            raise SystemExit(f"missing cover source for {e['slug']}: {src}")
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        out_dir = os.path.join(public, "work", e["slug"])
        os.makedirs(out_dir, exist_ok=True)
        size = save_webp(crop_to(im, W, H, e["cover"].get("focusY", 0.5)), os.path.join(out_dir, "cover.webp"))
        print(f"{e['slug']}: cover {size // 1024} KB")


if __name__ == "__main__":
    main()
