#!/usr/bin/env python3
"""Generate the site's icon set and default social share image.

There is no logo file, so the marks are drawn from the palette in
src/styles/global.css (--color-brand #0f766e, --color-surface #fffaf2,
--color-ink #10201f, --color-accent #d99a2b) and the brand initial.

Writes into public/ (Astro copies it to dist/):
  favicon.ico (16/32/48), favicon-32x32.png, apple-touch-icon.png (180),
  icon-192.png, icon-512.png, og.png (1200x630)

site.webmanifest is hand-written next to them. scripts/validate/seo-hygiene.mjs
checks every file exists with the right dimensions, so re-run this only to
change the artwork:  python3 scripts/seo/generate-brand-assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BRAND = (15, 118, 110)
SURFACE = (255, 250, 242)
INK = (16, 32, 31)
MUTED = (82, 97, 96)
ACCENT = (217, 154, 43)
WHITE = (255, 255, 255)
OUT = Path(__file__).resolve().parents[2] / "public"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
FONT_REGULAR = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def font(size, bold=True):
    for path in (FONT_CANDIDATES if bold else FONT_REGULAR):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit("no TrueType font found; install DejaVu or run on macOS")


def mark(size):
    """Teal rounded square, white initial, amber check bar under it."""
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.2), fill=BRAND)
    f = font(int(s * 0.66))
    box = d.textbbox((0, 0), "A", font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((s - w) / 2 - box[0], (s - h) / 2 - box[1] - s * 0.05), "A", font=f, fill=WHITE)
    bar_h = max(int(s * 0.07), scale)
    d.rounded_rectangle([int(s * 0.28), int(s * 0.80), int(s * 0.72), int(s * 0.80) + bar_h], radius=bar_h // 2, fill=ACCENT)
    return img.resize((size, size), Image.LANCZOS)


def og():
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), SURFACE)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 28, h], fill=BRAND)
    img.paste(mark(132), (96, 96), mark(132))
    d.text((256, 116), "ApprovalPrep", font=font(84), fill=INK)
    d.rectangle([96, 290, 256, 298], fill=ACCENT)
    lines = ["Self-service letters and approval-ready", "documents, ready before you apply."]
    for i, line in enumerate(lines):
        d.text((96, 330 + i * 72), line, font=font(56), fill=INK)
    d.text((96, 520), "PDF + editable DOCX kits  ·  approvalprep.com", font=font(34, bold=False), fill=MUTED)
    return img


def main():
    OUT.mkdir(exist_ok=True)
    mark(48).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    mark(32).save(OUT / "favicon-32x32.png")
    apple = Image.new("RGB", (180, 180), BRAND)  # iOS ignores alpha; fill the corners
    m = mark(180)
    apple.paste(m, (0, 0), m)
    apple.save(OUT / "apple-touch-icon.png")
    mark(192).save(OUT / "icon-192.png")
    mark(512).save(OUT / "icon-512.png")
    og().save(OUT / "og.png", optimize=True)
    print("[brand-assets] wrote favicon.ico, favicon-32x32.png, apple-touch-icon.png, icon-192.png, icon-512.png, og.png")


if __name__ == "__main__":
    main()
