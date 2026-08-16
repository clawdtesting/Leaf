#!/usr/bin/env python3
"""Convert world-decoration / terrain art JPGs into game-ready PNGs.

Companion to condition_art.py (which handles the core grass/buildings/Leaf
sheet). This one handles the decoration & terrain library: trees, bushes, ponds,
logs, rocks, fences, paths, ruins, flowers, etc.

Run from anywhere in the repo:

    python3 game.agi.eth/tools/convert_world_art.py

Behaviour per source JPG in packages/game-client/public/assets/:
- TEXTURES (grass/water): stay opaque, downscaled to a tile-friendly size.
- Everything else: the neutral 'transparency' checkerboard is keyed out to real
  alpha (background tone learned per-image), trimmed to content, capped in size.
  Multi-object atlas sheets are keyed whole so their items can be sliced later.
- SKIP: the core building/Leaf source names are ignored so this tool never
  clobbers assets owned by condition_art.py.

Requires Pillow:  pip install Pillow
"""
from PIL import Image
from collections import deque
import glob
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(
    os.path.join(_HERE, "..", "packages", "game-client", "public", "assets")
)

# Core sources owned by condition_art.py — never processed here.
SKIP = {"Leaf.jpg", "grass.jpg", "cabin.jpg", "workshop.jpg", "watchtower.jpg", "greenhouse.jpg"}

# Full-bleed textures: no background to remove. Maps source -> output name.
TEXTURES = {
    "grass 2.jpg": "grass2.png",
    "grass 3.jpg": "grass3.png",
    "Gemini_Generated_Image_514l6f514l6f514l.jpg": "water.png",
}

# Subjects that are themselves neutral gray need a stricter neutral test so the
# checker (sat<=8) is keyed but the warm-gray masonry (sat>=15) is preserved.
STRICT = {"stone wall.jpg"}


def _neutral(px, sat_thresh):
    mx, mn = max(px[0], px[1], px[2]), min(px[0], px[1], px[2])
    return (mx - mn) <= sat_thresh, mx


def sample_band(im, sat_thresh):
    """Learn the background brightness band from the image edges."""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    br = []
    sx = max(1, w // 40)
    sy = max(1, h // 40)
    for x in range(0, w, sx):
        for y in (1, h - 2):
            n, mx = _neutral(px[x, y], sat_thresh)
            if n:
                br.append(mx)
    for y in range(0, h, sy):
        for x in (1, w - 2):
            n, mx = _neutral(px[x, y], sat_thresh)
            if n:
                br.append(mx)
    if not br:
        return (9999, 9999)  # no neutral border -> key nothing
    return (min(br) - 18, max(br) + 18)


def flood_key(img, sat_thresh=28):
    """Return an RGBA copy with border-connected background made transparent."""
    lo, hi = sample_band(img, sat_thresh)

    def is_bg(p):
        n, mx = _neutral(p, sat_thresh)
        return n and lo <= mx <= hi

    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not seen[y * w + x] and is_bg(px[x, y]):
                seen[y * w + x] = 1
                dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not seen[y * w + x] and is_bg(px[x, y]):
                seen[y * w + x] = 1
                dq.append((x, y))
    while dq:
        x, y = dq.popleft()
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(px[nx, ny]):
                seen[ny * w + nx] = 1
                dq.append((nx, ny))
    return img


def cap(img, longest):
    w, h = img.size
    s = longest / max(w, h)
    if s < 1:
        img = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return img


def main():
    for path in sorted(glob.glob(os.path.join(ASSETS, "*.jpg"))):
        base = os.path.basename(path)
        if base in SKIP:
            continue
        if base in TEXTURES:
            out = TEXTURES[base]
            img = cap(Image.open(path).convert("RGB"), 256)
            img.save(os.path.join(ASSETS, out))
            print(f"{base:44s} -> {out}  (texture {img.size[0]}x{img.size[1]})")
        else:
            out = os.path.splitext(base)[0].replace(" ", "_") + ".png"
            keyed = flood_key(Image.open(path), sat_thresh=12 if base in STRICT else 28)
            bb = keyed.getbbox()
            if bb:
                keyed = keyed.crop(bb)
            keyed = cap(keyed, 512)
            keyed.save(os.path.join(ASSETS, out))
            print(f"{base:44s} -> {out}  (object {keyed.size[0]}x{keyed.size[1]})")


if __name__ == "__main__":
    main()
