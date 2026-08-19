#!/usr/bin/env python3
"""Condition the recolored Leaf walk-sheets (leaf_red / leaf_white) to match leaf.png.

The variants shipped with a baked-in 'transparency' checkerboard (opaque gray+white
squares) and no alpha; leaf_white was also 192x255 instead of 192x256, breaking the
64px frame grid.

These sheets are recolors of leaf.png with the SAME frame layout (verified: their keyed
silhouettes line up with leaf.png's, empty rows at the 0/64/128/192 frame boundaries).
So we only key the checkerboard back to transparency with condition_art.py's border
flood-fill (which stops at the subject's dark outlines) — no re-slicing or rescaling,
preserving exact pixel alignment with leaf.png — and pad leaf_white's missing bottom row
so the sheet is a clean 3x4 grid of 64px frames.
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
from condition_art import flood_key, ASSETS  # noqa: E402
from PIL import Image  # noqa: E402

FRAME = 64
COLS, ROWS = 3, 4
TARGET = (FRAME * COLS, FRAME * ROWS)  # 192x256


def condition_variant(name: str) -> None:
    keyed = flood_key(Image.open(os.path.join(ASSETS, name)))  # -> RGBA, bg transparent
    if keyed.size != TARGET:
        # Pad (transparent) or crop onto an exact 192x256 canvas, keeping the content
        # top-left anchored so every frame's top stays on its 64px boundary.
        canvas = Image.new("RGBA", TARGET, (0, 0, 0, 0))
        canvas.paste(keyed, (0, 0))
        keyed = canvas
    keyed.save(os.path.join(ASSETS, name))
    a = keyed.getchannel("A")
    lo, hi = a.getextrema()
    print(f"{name}: {keyed.size[0]}x{keyed.size[1]} RGBA, alpha extrema {(lo, hi)}")


if __name__ == "__main__":
    condition_variant("leaf_red.png")
    condition_variant("leaf_white.png")
    print("done")
