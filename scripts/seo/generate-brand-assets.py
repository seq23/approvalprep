#!/usr/bin/env python3
"""Generate the site's icon set and default social share image.

Drawn from the approved ApprovalPrep design system (6 Nov 2026,
https://claude.ai/artifact/BKh2xEmgb1wAitJ9Tq9N4T): the mark is a ticked
checkbox (signal #FF7A3D box, carbon #1D1C21 tick); the wordmark is Archivo 800
at 112% width with "Prep" on a highlighter #FFE066 block; ground paper #F7F3EA.

Writes into public/ (Astro copies it to dist/):
  favicon.ico (16/32/48), favicon-32x32.png, apple-touch-icon.png (180),
  icon-192.png, icon-512.png, og.png (1200x630)
public/favicon.svg and site.webmanifest are hand-written next to them.
scripts/validate/seo-hygiene.mjs checks every file exists with the right
dimensions, so re-run this only to change the artwork.

The brand fonts are not committed. Put the Google Fonts files in one folder and
point BRAND_FONT_DIR at it:
  Archivo.ttf     (google/fonts ofl/archivo/Archivo[wdth,wght].ttf)
  Atkinson.ttf    (ofl/atkinsonhyperlegiblenext/AtkinsonHyperlegibleNext[wght].ttf)
  PlexMono.ttf    (ofl/ibmplexmono/IBMPlexMono-Medium.ttf)
  BRAND_FONT_DIR=/path/to/fonts python3 scripts/seo/generate-brand-assets.py
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PAPER = (247, 243, 234)
CARBON = (29, 28, 33)
MUTED = (87, 83, 76)
SIGNAL = (255, 122, 61)
HIGHLIGHTER = (255, 224, 102)
RULE = (217, 208, 190)
OUT = Path(__file__).resolve().parents[2] / "public"
FONT_DIR = Path(os.environ.get("BRAND_FONT_DIR", ""))


def font(name, size, axes=None):
    path = FONT_DIR / name
    if not FONT_DIR or not path.exists():
        raise SystemExit(f"NAMED STOP [BRAND_FONT_MISSING] {path} not found; set BRAND_FONT_DIR (see the docstring)")
    f = ImageFont.truetype(str(path), size)
    if axes:
        f.set_variation_by_axes(axes)
    return f


def mark(size):
    """The ticked checkbox, drawn at 4x and scaled down (viewBox 0 0 64 64)."""
    scale = 4
    s = size * scale
    u = s / 64
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([2 * u, 2 * u, 62 * u, 62 * u], radius=10 * u, fill=SIGNAL)
    w = max(int(7.5 * u), 1)
    pts = [(15 * u, 33 * u), (27 * u, 45 * u), (49 * u, 19 * u)]
    d.line(pts, fill=CARBON, width=w, joint="curve")
    r = w / 2
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=CARBON)
    return img.resize((size, size), Image.LANCZOS)


def og():
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    # Archivo axes in file order: weight then width.
    display = font("Archivo.ttf", 76, [800, 112])
    m = mark(96)
    img.paste(m, (96, 92), m)
    x, y = 214, 98
    d.text((x, y), "Approval", font=display, fill=CARBON)
    aw = d.textlength("Approval", font=display)
    pw = d.textlength("Prep", font=display)
    d.rounded_rectangle([x + aw + 6, y + 6, x + aw + 6 + pw + 20, y + 92], radius=6, fill=HIGHLIGHTER)
    d.text((x + aw + 16, y), "Prep", font=display, fill=CARBON)
    head = font("Archivo.ttf", 64, [800, 100])
    d.text((96, 268), "Dispute it yourself.", font=head, fill=CARBON)
    line2 = "Skip the monthly fee."
    lw = d.textlength(line2, font=head)
    d.rounded_rectangle([90, 352, 96 + lw + 10, 432], radius=6, fill=HIGHLIGHTER)
    d.text((96, 348), line2, font=head, fill=CARBON)
    d.line([(96, 500), (1104, 500)], fill=RULE, width=2)
    mono = font("PlexMono.ttf", 26)
    d.text((96, 526), "DIY CREDIT LETTERS  ·  PAID ONCE  ·  APPROVALPREP.COM", font=mono, fill=MUTED)
    return img


def main():
    OUT.mkdir(exist_ok=True)
    mark(48).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    mark(32).save(OUT / "favicon-32x32.png")
    apple = Image.new("RGB", (180, 180), PAPER)  # iOS ignores alpha; fill the corners
    m = mark(180)
    apple.paste(m, (0, 0), m)
    apple.save(OUT / "apple-touch-icon.png")
    mark(192).save(OUT / "icon-192.png")
    mark(512).save(OUT / "icon-512.png")
    og().save(OUT / "og.png", optimize=True)
    print("[brand-assets] wrote favicon.ico, favicon-32x32.png, apple-touch-icon.png, icon-192.png, icon-512.png, og.png")


if __name__ == "__main__":
    main()
