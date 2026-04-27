#!/usr/bin/env python3
"""
Regenerate all PWA icon and splash assets from the source logo.

Usage:
    python3 scripts/generate-pwa-assets.py

Requirements:
    pip install Pillow
"""

from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "app-icon-source.png")
PUBLIC = os.path.join(ROOT, "public")
SPLASH_DIR = os.path.join(PUBLIC, "splash")

BG = (250, 247, 242, 255)  # #FAF7F2 — brand cream

src = Image.open(SRC).convert("RGBA")


def save_icon(size: int, path: str) -> None:
    img = src.resize((size, size), Image.LANCZOS)
    img.save(path, "PNG", optimize=True)
    print(f"  {os.path.relpath(path, ROOT)}")


def save_maskable(canvas_size: int, path: str) -> None:
    logo_size = int(canvas_size * 0.80)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), BG)
    logo = src.resize((logo_size, logo_size), Image.LANCZOS)
    offset = (canvas_size - logo_size) // 2
    canvas.paste(logo, (offset, offset), logo)
    canvas.save(path, "PNG", optimize=True)
    print(f"  {os.path.relpath(path, ROOT)}")


def save_splash(w: int, h: int) -> None:
    canvas = Image.new("RGBA", (w, h), BG)
    logo_size = int(min(w, h) * 0.30)
    logo = src.resize((logo_size, logo_size), Image.LANCZOS)
    x = (w - logo_size) // 2
    y = (h - logo_size) // 2
    canvas.paste(logo, (x, y), logo)
    out = canvas.convert("RGB")
    path = os.path.join(SPLASH_DIR, f"apple-{w}x{h}.png")
    out.save(path, "PNG", optimize=True)
    print(f"  {os.path.relpath(path, ROOT)}")


print("==> Plain icons")
save_icon(512, os.path.join(PUBLIC, "icon-512x512.png"))
save_icon(192, os.path.join(PUBLIC, "icon-192x192.png"))
save_icon(180, os.path.join(PUBLIC, "apple-touch-icon.png"))
save_icon(167, os.path.join(PUBLIC, "apple-touch-icon-167.png"))
save_icon(152, os.path.join(PUBLIC, "apple-touch-icon-152.png"))
save_icon(120, os.path.join(PUBLIC, "apple-touch-icon-120.png"))
save_icon(1024, os.path.join(PUBLIC, "app-icon-source.png"))

print("==> Maskable icons")
save_maskable(512, os.path.join(PUBLIC, "icon-maskable-512.png"))
save_maskable(192, os.path.join(PUBLIC, "icon-maskable-192.png"))

print("==> iOS splash screens")
SPLASH_SIZES = [
    (1290, 2796),
    (1170, 2532),
    (1284, 2778),
    (1242, 2688),
    (828,  1792),
    (750,  1334),
    (1536, 2048),
    (1668, 2388),
    (2048, 2732),
]
for w, h in SPLASH_SIZES:
    save_splash(w, h)

print("\nAll assets generated.")
