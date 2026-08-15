import tkinter as tk
import sys
from pathlib import Path

def get_size(path):
    root = tk.Tk()
    root.withdraw()  # hide window
    img = tk.PhotoImage(file=path)
    w = img.width()
    h = img.height()
    root.destroy()
    return w, h

for i in range(1,5):
    fname = f'/home/emperor/.hermes/images/clip_20260815_1924{40+i:02d}_{i}.png' if i!=2 else None
    # Actually we need to map correctly
# Let's just list files
