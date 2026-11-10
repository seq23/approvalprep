// Paper-format pins (6 Nov 2026 Pinterest review). The pin shows the useful thing itself:
// a sample letter's opening or 5 to 8 checklist lines in large type, on a cream paper look,
// carbon text, and ONE accent colour per board (data/pinterest/boards.json "accent"). No
// product box, no kit art: these layouts never composite public/assets/products/*.
// An optional photo layout puts a licensed daylight photo (data/pinterest/photos.json,
// checked by scripts/pinterest/quality.mjs photoIssue) above one bold headline.
//
// TEXT spec per layout (wrap width px, max lines, px size at 1000 wide) is read by the quality gate's
// thumbnail check, so a pin whose text would be cut off or unreadable at 236px never ships.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import opentype from "opentype.js";
import { PIN_WIDTH, PIN_HEIGHT } from "../../src/lib/pinfeed.mjs";

export const PAPER = "#F7F3EA";
export const SHEET = "#FFFFFF";
export const CARBON = "#1D1C21";
const RULE = "#E2DBCB";

// One accent per board. tint = the highlighter block behind headline words (carbon text on it).
export const ACCENTS = {
  orange: { hex: "#FF7A3D", tint: "#FFC9AE" },
  highlighter: { hex: "#E8C200", tint: "#FFE066" },
  green: { hex: "#2F6B3A", tint: "#C7DCC4" },
  red: { hex: "#B42318", tint: "#F2C4BF" },
  ledger: { hex: "#2B4A7A", tint: "#C5D1E6" },
};

export const PAPER_LAYOUTS = ["paper-list", "paper-list-band", "paper-letter", "paper-letter-low", "photo-band"];
export const FORMAT_OF = { "paper-list": "list", "paper-list-band": "list", "paper-letter": "letter", "paper-letter-low": "letter", "photo-band": "photo" };

// What each layout prints: headline + body roles. body.lines = lines per item (list) or the
// total line budget (letter); body.minItems/maxItems bound a checklist.
export const PAPER_TEXT = {
  "paper-list": { headline: { width: 840, lines: 3, size: 76, face: "head" }, body: { width: 720, lines: 2, size: 48, face: "bold", minItems: 5, maxItems: 8, budget: 12 } },
  "paper-list-band": { headline: { width: 860, lines: 3, size: 76, face: "head" }, body: { width: 740, lines: 2, size: 48, face: "bold", minItems: 5, maxItems: 8, budget: 12 } },
  "paper-letter": { headline: { width: 860, lines: 3, size: 76, face: "head" }, body: { width: 750, lines: 14, size: 44, face: "body", minLines: 6 } },
  "paper-letter-low": { headline: { width: 840, lines: 3, size: 80, face: "head" }, body: { width: 770, lines: 14, size: 44, face: "body", minLines: 6 } },
  "photo-band": { headline: { width: 860, lines: 3, size: 84, face: "head" } },
};

// Text is drawn as vector paths from the bundled OFL fonts (scripts/pinterest/fonts), so a
// pin renders the same on a Mac, in CI and in the Cloudflare build, and wrapping uses each
// line's real width rather than a character guess.
const FONT_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "fonts");
const FONTS = {};
const font = (name) => (FONTS[name] ||= opentype.loadSync(path.join(FONT_DIR, { head: "ArchivoSemiExpanded-ExtraBold.ttf", bold: "AtkinsonHyperlegible-Bold.ttf", body: "AtkinsonHyperlegible-Regular.ttf", mono: "IBMPlexMono-Bold.ttf" }[name])));
export const textWidth = (s, size, face = "body") => font(face).getAdvanceWidth(String(s), size);
/** Greedy wrap by real width. Returns every line (callers compare with their line budget). */
export function wrapPx(s, size, maxWidth, face = "body") {
  const out = [];
  let cur = "";
  for (const w of String(s).trim().split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(next, size, face) > maxWidth) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}
const t = (x, y, s, { size = 48, face = "body", fill = CARBON, anchor = "start" } = {}) => {
  const w = textWidth(s, size, face);
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return `<path d="${font(face).getPath(String(s), x0, y, size).toPathData(1)}" fill="${fill}"/>`;
};
const footer = (accent, y = 1452) => `<rect x="60" y="${y - 30}" width="34" height="34" rx="6" fill="none" stroke="${accent.hex}" stroke-width="5"/><path d="M68 ${y - 13} l7 7 l13 -16" stroke="${CARBON}" stroke-width="5" fill="none" stroke-linecap="round"/>${t(108, y, "approvalprep.com", { size: 32, face: "mono" })}`;

/** Headline lines with a highlighter block behind each, left-aligned at x. Returns { svg, bottom }. */
function headlineBlock(text, spec, accent, x, y0, { centre = false } = {}) {
  const ls = wrapPx(text, spec.size, spec.width, spec.face).slice(0, spec.lines);
  const lh = Math.round(spec.size * 1.16);
  let svg = "";
  ls.forEach((l, i) => {
    const y = y0 + i * lh;
    const w = Math.min(900, textWidth(l, spec.size, spec.face));
    const lx = centre ? 500 - w / 2 : x;
    svg += `<rect x="${lx - 12}" y="${y - spec.size * 0.62}" width="${w + 24}" height="${spec.size * 0.72}" fill="${accent.tint}"/>`;
    svg += t(centre ? 500 : x, y, l, { size: spec.size, face: spec.face, anchor: centre ? "middle" : "start" });
  });
  return { svg, bottom: y0 + (ls.length - 1) * lh + spec.size * 0.3 };
}

function listRows(items, spec0, accent, x, top, bottom, { numbered = false } = {}) {
  // Six lines or fewer get bigger type (never smaller than the spec the gate checked).
  const spec = items.length <= 6 ? { ...spec0, size: Math.round(spec0.size * 1.12), width: spec0.width } : spec0;
  if (items.some((s) => wrapPx(s, spec.size, spec.width, spec.face).length > spec.lines)) Object.assign(spec, spec0);
  const wrapped = items.map((s) => wrapPx(s, spec.size, spec.width, spec.face).slice(0, spec.lines));
  const lh = Math.round(spec.size * 1.18);
  const textH = wrapped.reduce((a, w) => a + w.length * lh, 0);
  const gap = Math.max(18, Math.min(100, (bottom - top - textH) / Math.max(1, items.length)));
  let y = top + gap / 2 + spec.size;
  let svg = "";
  wrapped.forEach((w, i) => {
    if (numbered) svg += `<circle cx="${x + 26}" cy="${y - spec.size * 0.35}" r="28" fill="${accent.hex}"/>${t(x + 26, y - spec.size * 0.35 + 15, String(i + 1), { size: 40, face: "head", anchor: "middle", fill: accent === ACCENTS.highlighter ? CARBON : "#FFFFFF" })}`;
    else svg += `<rect x="${x}" y="${y - spec.size * 0.82}" width="48" height="48" rx="8" fill="${SHEET}" stroke="${CARBON}" stroke-width="4"/>${i < 2 ? `<path d="M${x + 9} ${y - spec.size * 0.82 + 26} l11 11 l21 -26" stroke="${accent.hex}" stroke-width="8" fill="none" stroke-linecap="round"/>` : ""}`;
    w.forEach((line, j) => { svg += t(x + 76, y + j * lh, line, { size: spec.size, face: spec.face }); });
    y += w.length * lh + gap;
    if (numbered && i < wrapped.length - 1) svg += `<rect x="${x}" y="${y - gap / 2 - spec.size * 0.9}" width="${860 - x + 60}" height="2" fill="${RULE}"/>`;
  });
  return svg;
}

/** The letter's lines in reading order, wrapped: [{ text, bold, highlight }]. */
export function letterLines(letter, spec) {
  const out = [];
  for (const l of wrapPx(letter.re, spec.size, spec.width, "bold")) out.push({ text: l, bold: true });
  out.push({ text: "", gap: true });
  out.push({ text: letter.greeting });
  letter.body.forEach((p, i) => {
    out.push({ text: "", gap: true });
    for (const l of wrapPx(p, spec.size, spec.width, "body")) out.push({ text: l, highlight: i === 0 });
  });
  return out;
}

function letterSheet(letter, spec, accent, { x, y, w, h, rotate = 0, shrink = false }) {
  const lh = Math.round(spec.size * 1.3);
  const all = letterLines(letter, spec);
  // Whole paragraphs only; a cut letter ends on a fade, not a half sentence.
  let used = 0, fit = 0;
  for (const l of all) { const dh = l.gap ? lh * 0.45 : lh; if (140 + used + dh > h - 70) break; used += dh; fit++; }
  let shown = all.slice(0, fit);
  if (shown.length < all.length) { const lastGap = shown.map((l) => !!l.gap).lastIndexOf(true); if (lastGap > 3) shown = shown.slice(0, lastGap); }
  if (shrink) h = Math.min(h, 140 + shown.reduce((a2, l) => a2 + (l.gap ? lh * 0.45 : lh), 0) + (shown.length < all.length ? lh : 0) + 60);
  let svg = `<g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})"><rect x="${x + 10}" y="${y + 12}" width="${w}" height="${h}" fill="${RULE}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${SHEET}"/>`;
  svg += t(x + w - 50, y + 70, "[Date]", { size: 34, face: "mono", anchor: "end" });
  let ly = y + 140;
  for (const l of shown) {
    if (l.gap) { ly += lh * 0.45; continue; }
    if (l.highlight) svg += `<rect x="${x + 44}" y="${ly - spec.size * 0.8}" width="${Math.min(w - 80, textWidth(l.text, spec.size, "body") + 12)}" height="${spec.size * 1.05}" fill="${ACCENTS.highlighter.tint}" opacity="0.85"/>`;
    svg += t(x + 50, ly, l.text, { size: spec.size, face: l.bold ? "bold" : "body" });
    ly += lh;
  }
  if (shown.length < all.length) svg += t(x + 50, ly, "…", { size: spec.size, face: "bold" });
  return `${svg}</g>`;
}

const svgDoc = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}"><rect width="100%" height="100%" fill="${PAPER}"/>${body}</svg>`);

const LAYOUT = {
  "paper-list": (v, a) => {
    const s = PAPER_TEXT["paper-list"];
    const hb = headlineBlock(v.headline, s.headline, a, 72, 170);
    const top = hb.bottom + 50;
    return `<rect x="0" y="0" width="1000" height="16" fill="${a.hex}"/>${hb.svg}<rect x="70" y="${top + 10}" width="870" height="${1370 - top}" fill="${RULE}"/><rect x="60" y="${top}" width="870" height="${1370 - top}" fill="${SHEET}"/>${listRows(v.items, s.body, a, 100, top + 10, 1360)}${footer(a)}`;
  },
  "paper-list-band": (v, a) => {
    const s = PAPER_TEXT["paper-list-band"];
    const ls = wrapPx(v.headline, s.headline.size, s.headline.width, "head").slice(0, s.headline.lines);
    const bandH = 120 + ls.length * Math.round(s.headline.size * 1.16);
    const lines = ls.map((l, i) => t(500, 130 + i * Math.round(s.headline.size * 1.16), l, { size: s.headline.size, face: "head", anchor: "middle" })).join("");
    return `<rect width="1000" height="${bandH}" fill="${a.tint}"/><rect y="${bandH}" width="1000" height="10" fill="${a.hex}"/>${lines}${listRows(v.items, s.body, a, 80, bandH + 40, 1380, { numbered: true })}${footer(a)}`;
  },
  "paper-letter": (v, a) => {
    const s = PAPER_TEXT["paper-letter"];
    const hb = headlineBlock(v.headline, s.headline, a, 0, 160, { centre: true });
    const top = hb.bottom + 60;
    return `${hb.svg}${letterSheet(v.letter, s.body, a, { x: 70, y: top, w: 860, h: 1390 - top, rotate: -1.5, shrink: true })}<rect x="0" y="1484" width="1000" height="16" fill="${a.hex}"/>${footer(a, 1460)}`;
  },
  "paper-letter-low": (v, a) => {
    const s = PAPER_TEXT["paper-letter-low"];
    const ls = wrapPx(v.headline, s.headline.size, s.headline.width, "head").slice(0, s.headline.lines);
    const lh = Math.round(s.headline.size * 1.16);
    const hTop = 1400 - ls.length * lh;
    const hb = headlineBlock(v.headline, s.headline, a, 70, hTop + s.headline.size * 0.7);
    return `<rect width="1000" height="16" fill="${a.hex}"/>${letterSheet(v.letter, s.body, a, { x: 60, y: 60, w: 880, h: hTop - 120, rotate: 1.2 })}${hb.svg}${footer(a, 1462)}`;
  },
  "photo-band": (v, a) => {
    const s = PAPER_TEXT["photo-band"];
    const ls = wrapPx(v.headline, s.headline.size, s.headline.width, "head").slice(0, s.headline.lines);
    const lh = Math.round(s.headline.size * 1.14);
    const bandTop = 1500 - 150 - ls.length * lh;
    const lines = ls.map((l, i) => t(70, bandTop + 100 + i * lh, l, { size: s.headline.size, face: "head" })).join("");
    return `<rect y="${bandTop}" width="1000" height="${1500 - bandTop}" fill="${PAPER}"/><rect y="${bandTop}" width="1000" height="14" fill="${a.hex}"/>${lines}${footer(a, 1462)}`;
  },
};

export const isPaper = (v) => PAPER_LAYOUTS.includes(v?.layout);

/** PNG bytes of one paper-format pin. */
export async function renderPaper(v, root = process.cwd()) {
  const a = ACCENTS[v.palette];
  const draw = LAYOUT[v.layout];
  if (!a || !draw) throw new Error(`[paper-pins] FAIL ${v.id}: unknown layout ${v.layout} or accent ${v.palette}`);
  if (FORMAT_OF[v.layout] === "letter" && !v.letter) throw new Error(`[paper-pins] FAIL ${v.id}: letter layout without a letter`);
  if (FORMAT_OF[v.layout] === "list" && !(v.items || []).length) throw new Error(`[paper-pins] FAIL ${v.id}: list layout without checklist lines`);
  const svg = svgDoc(draw(v, a));
  if (FORMAT_OF[v.layout] !== "photo") return sharp(svg).png().toBuffer();
  const file = path.join(root, "public", "pins", "photos", String(v.photo || ""));
  if (!v.photo || !fs.existsSync(file)) throw new Error(`[paper-pins] FAIL ${v.id}: photo ${v.photo} missing`);
  const s = PAPER_TEXT["photo-band"];
  const bandTop = 1500 - 150 - wrapPx(v.headline, s.headline.size, s.headline.width, "head").slice(0, s.headline.lines).length * Math.round(s.headline.size * 1.14);
  const photo = await sharp(file).resize(1000, bandTop, { fit: "cover" }).png().toBuffer();
  return sharp(svg).composite([{ input: photo, top: 0, left: 0 }]).png().toBuffer();
}
