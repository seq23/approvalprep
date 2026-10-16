#!/usr/bin/env node
// Build step: writes 1000x1500 (2:3) Pinterest pins to dist/pins/<slug>.png for
// every item in data/pinterest/pinfeed.json, composed from the kit preview art in
// public/assets/products/. No photos and no people: the kit preview plus a title
// band. Runs after `astro build` (package.json "build"); an Astro endpoint cannot
// emit /pins/x.png under trailingSlash "always". Checked by validate:pinterest-launch.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadPinfeed, previewImagePath, wrapTitle, PIN_WIDTH, PIN_HEIGHT } from "../src/lib/pinfeed.mjs";

const outDir = path.join(process.env.PAGES_OUT_DIR || "dist", "pins");
const TEAL = "#10766e";
const CREAM = "#fff9f2";
const FONT = "DejaVu Sans, Liberation Sans, Helvetica, Arial, sans-serif";
const esc = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

const feed = loadPinfeed();
if (!feed.items.length) { console.error("[build-pin-images] FAIL no items in data/pinterest/pinfeed.json"); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
for (const item of feed.items) {
  const src = path.join("public", previewImagePath(item.imageSku));
  if (!fs.existsSync(src)) { console.error(`[build-pin-images] FAIL ${item.slug}: no preview art at ${src}`); process.exit(1); }
  const headline = item.kind === "guide" ? item.title.split(":")[0] : item.title.split(" — ")[0];
  const lines = wrapTitle(headline, 22, 4);
  const lineH = 76, headerH = 420;
  const startY = (headerH - lines.length * lineH) / 2 + 58;
  const footer = item.kind === "guide" ? "FREE GUIDE + CHECKLIST" : "SELF-SERVICE KIT · INSTANT DOWNLOAD";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}">
    <rect width="100%" height="100%" fill="${CREAM}"/>
    <rect width="100%" height="${headerH}" fill="${TEAL}"/>
    ${lines.map((l, i) => `<text x="500" y="${startY + i * lineH}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="64" fill="#ffffff">${esc(l)}</text>`).join("")}
    <rect x="60" y="1230" width="880" height="4" fill="#d4962a"/>
    <text x="500" y="1320" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="40" fill="${TEAL}">${esc(footer)}</text>
    <text x="500" y="1410" text-anchor="middle" font-family="${FONT}" font-size="44" fill="#1f2a29">approvalprep.com</text>
  </svg>`;
  const art = await sharp(src).resize(PIN_WIDTH, 750).png().toBuffer();
  await sharp(Buffer.from(svg)).composite([{ input: art, top: 450, left: 0 }]).png().toFile(path.join(outDir, `${item.slug}.png`));
}
console.log(`[build-pin-images] OK ${feed.items.length} pins in ${outDir}`);
