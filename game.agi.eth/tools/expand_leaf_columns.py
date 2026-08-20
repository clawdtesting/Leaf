#!/usr/bin/env python3
"""Rebuild a valid 3x4 walk-sheet from a single-column 1x4 pose sheet.

The replaced leaf.png / leaf_red.png / leaf_split.png were auto-cropped down to a
single ~62px-wide column of 4 poses (one per direction). The game slices the sheet
as a 3x4 grid of 64px frames (192x256) and animates 3 frames per direction, so a
single-column sheet has no valid frame grid and the walk animation breaks.

This expands each source into 192x256: rows 0/1/2 -> down/up/left, right is the
mirror of left, and each direction's single pose is placed in all 3 columns
(trimmed and bottom-centered exactly like the original leaf.png). The character
then faces the correct way in every direction; the 3 frames per direction are
identical, so there is no walking bob (the source only carries one pose each).
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
from condition_art import ASSETS  # noqa: E402
from PIL import Image  # noqa: E402

FRAME = 64
PAD = int(FRAME * 0.08)
TARGET = (FRAME * 3, FRAME * 4)  # 192x256


def pose(cell: Image.Image, mirror=False):
    bb = cell.getbbox()
    if not bb:
        return None
    sub = cell.crop(bb)
    if mirror:
        sub = sub.transpose(Image.FLIP_LEFT_RIGHT)
    sw, sh = sub.size
    avail = FRAME - 2 * PAD
    scale = avail / max(sw, sh)
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    return sub.resize((nw, nh), Image.LANCZOS)


def blit_row(dst, sub, out_row):
    if sub is None:
        return
    nw, nh = sub.size
    for col in range(3):
        dx = col * FRAME + (FRAME - nw) // 2
        dy = out_row * FRAME + (FRAME - PAD - nh)
        dst.paste(sub, (dx, dy), sub)


def expand(name: str) -> None:
    im = Image.open(os.path.join(ASSETS, name)).convert("RGBA")
    w, h = im.size
    rh = h // 4
    rows = [im.crop((0, r * rh, w, r * rh + rh)) for r in range(4)]
    out = Image.new("RGBA", TARGET, (0, 0, 0, 0))
    blit_row(out, pose(rows[0]), 0)               # down
    blit_row(out, pose(rows[1]), 1)               # up
    left = pose(rows[2])
    blit_row(out, left, 2)                         # left
    blit_row(out, pose(rows[2], mirror=True), 3)   # right = mirror of left
    out.save(os.path.join(ASSETS, name))
    print(f"{name}: -> {out.size[0]}x{out.size[1]} (3x4, {'left+mirror' if left else 'empty'})")


if __name__ == "__main__":
    for n in ("leaf.png", "leaf_red.png", "leaf_split.png"):
        expand(n)
    print("done")
