#!/usr/bin/env python3
"""Condition the raw JPG art into game-ready transparent PNGs.

- Removes the gray 'transparency' checkerboard by flood-filling from the borders
  (stops at the dark outlines of the subject, so interior neutral pixels survive).
- Grass: opaque, downscaled seamless ground tile (no transparency).
- Buildings + Leaf sheet: transparent background.
- Leaf sheet: sliced into a clean 3x4 grid, each frame trimmed and bottom-centered
  into a uniform cell, repacked with zero padding so Phaser can slice it.
"""
from PIL import Image
from collections import deque
import os

# Resolve the game-client asset dir relative to this file (tools/ -> ../packages/...)
_HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(
    os.path.join(_HERE, "..", "packages", "game-client", "public", "assets")
)
OUT = ASSETS  # write PNGs alongside the source JPGs

def _neutral(px):
    r, g, b = px[0], px[1], px[2]
    mx, mn = max(r, g, b), min(r, g, b)
    return (mx - mn) <= 28, mx

def sample_bg_band(img):
    """Sample the four edges to learn the actual checkerboard brightness band, so we
    only remove grays near the real background tone (dark on buildings, light on the
    Leaf sheet) and never a subject's own gray (e.g. the tower's pale stone)."""
    im = img.convert("RGB")
    w, h = im.size
    px = im.load()
    brights = []
    step = max(1, w // 40)
    for x in range(0, w, step):
        for y in (1, h - 2):
            neu, mx = _neutral(px[x, y])
            if neu:
                brights.append(mx)
    step = max(1, h // 40)
    for y in range(0, h, step):
        for x in (1, w - 2):
            neu, mx = _neutral(px[x, y])
            if neu:
                brights.append(mx)
    if not brights:
        return (45, 250)
    lo, hi = min(brights), max(brights)
    return (lo - 18, hi + 18)

def make_is_bg(band):
    lo, hi = band
    def is_bg(px):
        neu, mx = _neutral(px)
        return neu and lo <= mx <= hi
    return is_bg

def flood_key(img):
    """Return RGBA image with border-connected background pixels made transparent.
    The background tone is learned per-image from the edges."""
    is_bg = make_is_bg(sample_bg_band(img))
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = bytearray(w * h)
    dq = deque()
    # seed from all border pixels that look like background
    for x in range(w):
        for y in (0, h - 1):
            if not visited[y * w + x] and is_bg(px[x, y]):
                visited[y * w + x] = 1
                dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y * w + x] and is_bg(px[x, y]):
                visited[y * w + x] = 1
                dq.append((x, y))
    while dq:
        x, y = dq.popleft()
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                if is_bg(px[nx, ny]):
                    visited[ny * w + nx] = 1
                    dq.append((nx, ny))
    return img

def bbox_nonempty(img):
    return img.getbbox()

def process_building(name_in, name_out, target=192):
    img = Image.open(os.path.join(ASSETS, name_in))
    keyed = flood_key(img)
    bb = keyed.crop(keyed.getbbox())
    # scale so the longest side == target, preserve aspect
    w, h = bb.size
    scale = target / max(w, h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    bb = bb.resize((nw, nh), Image.LANCZOS)
    bb.save(os.path.join(OUT, name_out))
    print(f"{name_out}: {nw}x{nh} (from {w}x{h})")

def process_grass(size=32):
    img = Image.open(os.path.join(ASSETS, "grass.jpg")).convert("RGB")
    img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(OUT, "grass.png"))
    print(f"grass.png: {size}x{size}")

def process_leaf(cols=3, rows=4, frame=64):
    sheet = Image.open(os.path.join(ASSETS, "Leaf.jpg"))
    keyed = flood_key(sheet)
    W, H = keyed.size
    cw, ch = W // cols, H // rows
    out = Image.new("RGBA", (frame * cols, frame * rows), (0, 0, 0, 0))
    pad = int(frame * 0.08)
    for r in range(rows):
        for c in range(cols):
            cell = keyed.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            bb = cell.getbbox()
            if bb:
                sub = cell.crop(bb)
                sw, sh = sub.size
                avail = frame - 2 * pad
                scale = avail / max(sw, sh)
                nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
                sub = sub.resize((nw, nh), Image.LANCZOS)
                # bottom-center within the frame
                dx = c * frame + (frame - nw) // 2
                dy = r * frame + (frame - pad - nh)
                out.paste(sub, (dx, dy), sub)
    out.save(os.path.join(OUT, "leaf.png"))
    print(f"leaf.png: {out.size[0]}x{out.size[1]} ({cols}x{rows} frames of {frame}px)")

if __name__ == "__main__":
    process_grass(32)
    process_building("cabin.jpg", "cabin.png")
    process_building("workshop.jpg", "workshop.png")
    process_building("watchtower.jpg", "watchtower.png")
    process_building("greenhouse.jpg", "greenhouse.png")
    process_leaf()
    print("done")
