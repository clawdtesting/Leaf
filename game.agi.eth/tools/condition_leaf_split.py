#!/usr/bin/env python3
"""Build a game-ready walk-sheet from leaf_split.jpg (the red/blue split-robe mage).

Source: leaf_split.jpg — a 1024x1026 JPEG, 4x4 grid (16 poses) on a checkerboard:
  row 0 = front-facing, row 1 = back-facing, rows 2-3 = side (staff) poses.

The game slices the character sheet as a 3x4 grid of 64px frames and animates:
  frames 0-2 walk-down, 3-5 walk-up, 6-8 walk-left, 9-11 walk-right (idle = 1).

So we remap the 4x4 source into a 3x4, 192x256 sheet, matching leaf.png:
  down  <- row0 cols 1,2,3 (plain front poses, no staff flicker)
  up    <- row1 cols 0,1,2 (back poses)
  left  <- row2 cols 0,1,2 (side poses with staff)
  right <- horizontal mirror of the left frames

Background is keyed with condition_art.py's border flood-fill and then de-fringed
(safe here: the robe is red/blue/black, so clearing light neutral edge pixels never
touches the character). Each frame is trimmed and bottom-centered exactly like leaf.png.
"""
import os
import sys
from collections import deque

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
from condition_art import ASSETS  # noqa: E402
from condition_leaf_variants import de_fringe  # noqa: E402
from PIL import Image  # noqa: E402

# This sheet's background is a LIGHT checkerboard (white + light gray, ~206-255)
# and the character is black/red/blue. condition_art's auto-learned band picked up
# a dark edge outlier and grew to cover all brightnesses, which leaked the flood
# through the black outline into the face. So key with a FIXED bright-neutral test:
# only near-neutral AND bright pixels are background; the black hood/face survive.
BG_NEUTRAL_MAXMIN = 30
BG_BRIGHT_MIN = 150


def _is_bg(px):
    r, g, b = px[0], px[1], px[2]
    mx, mn = max(r, g, b), min(r, g, b)
    return (mx - mn) <= BG_NEUTRAL_MAXMIN and mx >= BG_BRIGHT_MIN


def flood_key_light(img):
    """Border flood-fill that clears only bright-neutral (light checkerboard) pixels,
    stopping at the character's dark outline. Returns RGBA."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = bytearray(w * h)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not visited[y * w + x] and _is_bg(px[x, y]):
                visited[y * w + x] = 1
                dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y * w + x] and _is_bg(px[x, y]):
                visited[y * w + x] = 1
                dq.append((x, y))
    while dq:
        x, y = dq.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx] and _is_bg(px[nx, ny]):
                visited[ny * w + nx] = 1
                dq.append((nx, ny))
    return img

FRAME = 64
PAD = int(FRAME * 0.08)
SRC = os.environ.get("LEAF_SPLIT_SRC", os.path.join(ASSETS, "leaf_split.jpg"))
OUT = os.path.join(ASSETS, "leaf_split.png")

# (source_row, source_col) for each of the 12 output frames, in game order:
# down(0-2), up(3-5), left(6-8), right(9-11). "right" reuses the left cells mirrored.
DOWN = [(0, 1), (0, 2), (0, 3)]
UP = [(1, 0), (1, 1), (1, 2)]
LEFT = [(2, 0), (2, 1), (2, 2)]
LAYOUT = DOWN + UP + LEFT  # right is derived by mirroring LEFT


def place(dst, cell, out_col, out_row, mirror=False):
    bb = cell.getbbox()
    if not bb:
        return
    sub = cell.crop(bb)
    if mirror:
        sub = sub.transpose(Image.FLIP_LEFT_RIGHT)
    sw, sh = sub.size
    avail = FRAME - 2 * PAD
    scale = avail / max(sw, sh)
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    sub = sub.resize((nw, nh), Image.LANCZOS)
    dx = out_col * FRAME + (FRAME - nw) // 2
    dy = out_row * FRAME + (FRAME - PAD - nh)
    dst.paste(sub, (dx, dy), sub)


def main():
    sheet = flood_key_light(Image.open(SRC))
    sheet = de_fringe(sheet)
    W, H = sheet.size
    cw, ch = W // 4, H // 4  # 4x4 source grid

    def cell(r, c):
        return sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))

    out = Image.new("RGBA", (FRAME * 3, FRAME * 4), (0, 0, 0, 0))
    # down / up / left
    for i, (r, c) in enumerate(LAYOUT):
        place(out, cell(r, c), out_col=i % 3, out_row=i // 3)
    # right = mirror of the left row
    for i, (r, c) in enumerate(LEFT):
        place(out, cell(r, c), out_col=i, out_row=3, mirror=True)

    out.save(OUT)
    lo, hi = out.getchannel("A").getextrema()
    print(f"leaf_split.png: {out.size[0]}x{out.size[1]} RGBA, alpha extrema {(lo, hi)}")


if __name__ == "__main__":
    main()
