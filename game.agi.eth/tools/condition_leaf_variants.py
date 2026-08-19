#!/usr/bin/env python3
"""Condition the recolored Leaf walk-sheets (leaf_red / leaf_white) to match leaf.png.

The variants shipped with a baked-in 'transparency' checkerboard (opaque gray+white
squares) and no alpha; leaf_white was also 192x255 instead of 192x256.

They are recolors of leaf.png with the SAME frame layout (verified: keyed silhouettes
line up with leaf.png's 0/64/128/192 frame boundaries), so we key the checkerboard back
to transparency with condition_art.py's border flood-fill — no re-slicing or rescaling.

The flood-fill leaves a faint matte fringe: anti-aliased checkerboard pixels just outside
the subject's dark outline. de_fringe() peels those away — it repeatedly clears opaque
pixels that touch transparency AND look like the light neutral background. The subject's
dark outline (low brightness) and the warm-toned robes (not neutral) are never touched,
and because the outline shields the robe from ever bordering transparency, interior pixels
are safe across passes.

Sources are the original checkerboard PNGs (recovered from git into SRC_DIR); outputs are
written to the game-client assets as clean 192x256 RGBA sheets.
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
from condition_art import flood_key, ASSETS  # noqa: E402
from PIL import Image  # noqa: E402

FRAME = 64
TARGET = (FRAME * 3, FRAME * 4)  # 192x256
SRC_DIR = os.environ.get("LEAF_SRC_DIR", "/tmp/claude-0")

# A pixel is "background-like" if it is near-neutral (low saturation) and bright,
# i.e. part of the gray/white checkerboard or its anti-aliased fringe.
NEUTRAL_MAXMIN = 45   # max-min channel spread allowed
BRIGHT_MIN = 130      # minimum brightness (max channel)
PASSES = 5


def _bg_like(px) -> bool:
    r, g, b, a = px
    if a == 0:
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    return (mx - mn) <= NEUTRAL_MAXMIN and mx >= BRIGHT_MIN


def de_fringe(img: Image.Image, passes: int = PASSES) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    neigh = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))
    for _ in range(passes):
        doomed = []
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if p[3] == 0 or not _bg_like(p):
                    continue
                for dx, dy in neigh:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        doomed.append((x, y))
                        break
        if not doomed:
            break
        for x, y in doomed:
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0)
    return img


def condition_variant(src_name: str, out_name: str) -> None:
    keyed = flood_key(Image.open(os.path.join(SRC_DIR, src_name)))
    keyed = de_fringe(keyed)
    if keyed.size != TARGET:
        canvas = Image.new("RGBA", TARGET, (0, 0, 0, 0))
        canvas.paste(keyed, (0, 0))  # top-left anchored: keeps frame tops on 64px lines
        keyed = canvas
    keyed.save(os.path.join(ASSETS, out_name))
    lo, hi = keyed.getchannel("A").getextrema()
    print(f"{out_name}: {keyed.size[0]}x{keyed.size[1]} RGBA, alpha extrema {(lo, hi)}")


if __name__ == "__main__":
    condition_variant("leaf_red_src.png", "leaf_red.png")
    condition_variant("leaf_white_src.png", "leaf_white.png")
    print("done")
