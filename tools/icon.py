"""Draws the Dhyana app icon: a warm glowing orb above still water, with soft ripples, on a night-blue ground.

    python3 tools/icon.py          (needs Pillow: python3 -m pip install pillow)

Writes icons/icon-512.png, icons/icon-192.png and icons/apple-touch-icon.png (180).
Everything important sits inside the central 80%, so the maskable icon survives any mask shape.
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

N = 1024
ROOT = Path(__file__).resolve().parent.parent
TOP, BOTTOM = (30, 27, 62), (10, 13, 28)        # night sky to deep water
WARM, CORE = (242, 178, 92), (255, 244, 220)    # glow and the orb's bright centre
OX, OY, OR = N / 2, N * 0.43, N * 0.115         # the orb
WATER = N * 0.66                                 # where the ripples sit


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def ground():
    img = Image.new("RGB", (N, N))
    px = img.load()
    for y in range(N):
        base = lerp(TOP, BOTTOM, (y / N) ** 1.2)
        for x in range(N):
            d = math.hypot(x - OX, (y - OY) * 1.05)
            glow = max(0.0, 1 - d / (N * 0.42)) ** 2.6 * 0.42       # wide warm halo
            if d < OR:                                              # the orb itself
                t = (d / OR) ** 1.6
                px[x, y] = lerp(CORE, WARM, t)
                continue
            rim = max(0.0, 1 - (d - OR) / (N * 0.05)) ** 2 * 0.6    # soft edge just outside
            px[x, y] = lerp(base, WARM, min(1, glow + rim))
    return img


def ripples(size):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = size / N
    for w, alpha, width in [(300, 210, 10), (500, 140, 9), (700, 75, 8)]:
        h = w * 0.17
        box = [(OX - w / 2) * s, (WATER - h / 2) * s, (OX + w / 2) * s, (WATER + h / 2) * s]
        d.ellipse(box, outline=WARM + (alpha,), width=max(1, round(width * s)))
    return layer.filter(ImageFilter.GaussianBlur(3 * s))


def main():
    img = ground().convert("RGBA")
    img.alpha_composite(ripples(N))
    img = img.convert("RGB")
    out = ROOT / "icons"
    for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)]:
        img.resize((size, size), Image.LANCZOS).save(out / name, optimize=True)
        print("wrote", out / name)


if __name__ == "__main__":
    main()
