#!/usr/bin/env node
// Build step: writes 1000x1500 (2:3) Pinterest pins to dist/pins/ composed from
// the kit preview art in public/assets/products/. No photos, no people, no faces:
// the kit preview plus large, high-contrast text.
//   - dist/pins/<slug>.png for every launch item in data/pinterest/pinfeed.json
//     (the original title-band design, unchanged);
//   - dist/pins/<variant-id>.png for every variant in data/pinterest/queue.json,
//     released or not, in the variant's own layout and palette, so a pin's image
//     is already live on its release day (the feed itself flips at request time).
// Runs after `astro build` (package.json "build"). Checked by validate:pinterest-launch
// and validate:pinterest-drip.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadPinfeed, loadQueue, previewImagePath, wrapTitle, PIN_WIDTH, PIN_HEIGHT } from "../src/lib/pinfeed.mjs";

const outDir = path.join(process.env.PAGES_OUT_DIR || "dist", "pins");
const TEAL = "#10766e";
const CREAM = "#fff9f2";
const INK = "#1f2a29";
const GOLD = "#d4962a";
const FONT = "DejaVu Sans, Liberation Sans, Helvetica, Arial, sans-serif";
// Every palette pairs a dark field (white text, contrast >= 7:1) with a light ground.
const PALETTES = {
  teal: { dark: "#0d5f58", light: "#fff9f2", accent: "#d4962a" },
  navy: { dark: "#1b2a4a", light: "#f4f6fb", accent: "#e0a53a" },
  plum: { dark: "#4a1f45", light: "#fbf5f9", accent: "#e8a33d" },
  forest: { dark: "#1f4a2c", light: "#f5f9f2", accent: "#d9a441" },
  brick: { dark: "#7a2618", light: "#fdf6f1", accent: "#f0b44c" },
  slate: { dark: "#26323a", light: "#f3f5f6", accent: "#5fb3a8" },
};
const esc = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
const text = (x, y, s, { size = 64, weight = 700, fill = "#ffffff", anchor = "middle" } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-weight="${weight}" font-size="${size}" fill="${fill}">${esc(s)}</text>`;
const lines = (arr, x, y0, lh, opts) => arr.map((l, i) => text(x, y0 + i * lh, l, opts)).join("");
const svgDoc = (body, bg) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`);
const art = (src, w, h) => sharp(src).resize(w, h, { fit: "cover" }).png().toBuffer();
const footerLabel = (kind) => (kind === "guide" ? "FREE GUIDE + CHECKLIST" : "SELF-SERVICE KIT · INSTANT DOWNLOAD");

function srcFor(sku, label) {
  const src = path.join("public", previewImagePath(sku));
  if (!fs.existsSync(src)) { console.error(`[build-pin-images] FAIL ${label}: no preview art at ${src}`); process.exit(1); }
  return src;
}

async function launchPin(item) {
  const src = srcFor(item.imageSku, item.slug);
  const headline = item.kind === "guide" ? item.title.split(":")[0] : item.title.split(" — ")[0];
  const ls = wrapTitle(headline, 22, 4);
  const lineH = 76, headerH = 420;
  const startY = (headerH - ls.length * lineH) / 2 + 58;
  const body = `<rect width="100%" height="${headerH}" fill="${TEAL}"/>${lines(ls, 500, startY, lineH, { size: 64 })}
    <rect x="60" y="1230" width="880" height="4" fill="${GOLD}"/>${text(500, 1320, footerLabel(item.kind), { size: 40, fill: TEAL })}${text(500, 1410, "approvalprep.com", { size: 44, weight: 400, fill: INK })}`;
  await sharp(svgDoc(body, CREAM)).composite([{ input: await art(src, PIN_WIDTH, 750), top: 450, left: 0 }]).png().toFile(path.join(outDir, `${item.slug}.png`));
}

// Five layouts; each returns { body, bg, composite: [{w,h,top,left}] }.
const LAYOUTS = {
  // Headline in a dark band on top, art below, footer.
  "band-top": (v, p) => {
    const hl = wrapTitle(v.headline, 20, 4), sub = wrapTitle(v.subhead, 34, 2);
    return { bg: p.light, art: { w: 1000, h: 750, top: 470, left: 0 }, body: `<rect width="100%" height="470" fill="${p.dark}"/>${lines(hl, 500, (400 - hl.length * 78) / 2 + 70, 78, { size: 68 })}${lines(sub, 500, 1290, 46, { size: 36, weight: 600, fill: p.dark })}${text(500, 1430, "approvalprep.com", { size: 40, weight: 400, fill: INK })}` };
  },
  // Art on top, headline on a dark field below.
  "art-top": (v, p) => {
    const hl = wrapTitle(v.headline, 20, 4), sub = wrapTitle(v.subhead, 34, 2);
    return { bg: p.dark, art: { w: 1000, h: 750, top: 0, left: 0 }, body: `<rect y="750" width="100%" height="10" fill="${p.accent}"/>${lines(hl, 500, 850 + (4 - hl.length) * 30, 78, { size: 68 })}${lines(sub, 500, 1290 - (sub.length - 1) * 23, 46, { size: 36, weight: 400, fill: "#ffffff" })}${text(500, 1440, "approvalprep.com", { size: 38, weight: 700, fill: p.accent })}` };
  },
  // Headline, then a three-item checklist, then the art.
  checklist: (v, p) => {
    const hl = wrapTitle(v.headline, 22, 3);
    const items = (v.bullets || []).slice(0, 3);
    const rows = items.map((b, i) => `<rect x="90" y="${438 + i * 92}" width="52" height="52" rx="8" fill="#ffffff" stroke="${p.dark}" stroke-width="5"/><path d="M101 ${466 + i * 92} l12 12 l22 -26" stroke="${p.accent}" stroke-width="8" fill="none" stroke-linecap="round"/>${text(170, 477 + i * 92, b, { size: 42, weight: 600, fill: INK, anchor: "start" })}`).join("");
    return { bg: p.light, art: { w: 840, h: 630, top: 740, left: 80 }, body: `<rect width="100%" height="380" fill="${p.dark}"/>${lines(hl, 500, (380 - hl.length * 76) / 2 + 62, 76, { size: 62 })}${rows}<rect x="70" y="720" width="860" height="670" fill="${p.dark}" rx="18"/>${text(500, 1450, "approvalprep.com", { size: 40, weight: 400, fill: INK })}` };
  },
  // Dark field with a white card holding the headline, art inset below.
  card: (v, p) => {
    const hl = wrapTitle(v.headline, 18, 4);
    return { bg: p.dark, art: { w: 760, h: 570, top: 780, left: 120 }, body: `<rect x="60" y="70" width="880" height="640" rx="28" fill="${p.light}"/>${text(500, 160, footerLabel(v.kind), { size: 30, weight: 700, fill: p.dark })}${lines(hl, 500, 300 + (4 - hl.length) * 38, 84, { size: 70, fill: INK })}<rect x="110" y="760" width="780" height="610" fill="${p.accent}" rx="12"/>${text(500, 1440, "approvalprep.com", { size: 40, weight: 700, fill: "#ffffff" })}` };
  },
  // Left accent bar, left-aligned headline, art in the lower half.
  split: (v, p) => {
    const hl = wrapTitle(v.headline, 19, 4), sub = wrapTitle(v.subhead, 36, 2);
    return { bg: p.light, art: { w: 880, h: 660, top: 700, left: 120 }, body: `<rect width="70" height="100%" fill="${p.dark}"/><rect x="70" width="16" height="100%" fill="${p.accent}"/>${lines(hl, 130, 150, 84, { size: 70, fill: p.dark, anchor: "start" })}${lines(sub, 130, 150 + hl.length * 84 + 30, 46, { size: 36, weight: 400, fill: INK, anchor: "start" })}${text(130, 1440, "approvalprep.com", { size: 40, weight: 700, fill: p.dark, anchor: "start" })}` };
  },
};

async function variantPin(v) {
  const layout = LAYOUTS[v.layout], p = PALETTES[v.palette];
  if (!layout || !p) { console.error(`[build-pin-images] FAIL ${v.id}: unknown layout ${v.layout} or palette ${v.palette}`); process.exit(1); }
  const src = srcFor(v.imageSku, v.id);
  const spec = layout(v, p);
  const a = spec.art;
  await sharp(svgDoc(spec.body, spec.bg)).composite([{ input: await art(src, a.w, a.h), top: a.top, left: a.left }]).png().toFile(path.join(outDir, `${v.id}.png`));
}

const feed = loadPinfeed();
const queue = loadQueue();
if (!feed.items.length) { console.error("[build-pin-images] FAIL no items in data/pinterest/pinfeed.json"); process.exit(1); }
if (!queue.items.length) { console.error("[build-pin-images] FAIL no variants in data/pinterest/queue.json"); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
for (const item of feed.items) await launchPin(item);
const pending = [...queue.items];
const workers = Array.from({ length: 4 }, async () => { while (pending.length) await variantPin(pending.shift()); });
await Promise.all(workers);
console.log(`[build-pin-images] OK ${feed.items.length} launch pins + ${queue.items.length} variant pins in ${outDir}`);
