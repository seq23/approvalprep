// Pin quality gate (her call 6 Nov 2026: "green" means the pins are good, not just valid
// files). Every unreleased pin must pass three checks before it may stay scheduled:
//   1. LOOK: its image differs from the pins released just before it. A 256-bit difference
//      hash (dHash, 17x16 grayscale) must be at least MIN_DISTANCE bits from each of the
//      RECENT_WINDOW pins before it in release order. Measured on the 6 Nov queue: the same
//      page re-coloured in the same layout is 18-20 bits apart (a near-duplicate to
//      Pinterest); different layouts are 80+ apart.
//   2. HEADLINE: it names its own page's topic in the searcher's words: at least
//      MIN_HEADLINE_WORDS words and one topic word taken from the page's own URL, question
//      and its board's real Pinterest searches (data/pinterest/boards.json keywords + words).
//      "Finalize & Hand Off" fails; "Proof of income letter checklist" passes.
//   3. THUMBNAIL: every text role the layout prints fits uncut (TEXT_SPEC wrap) and stays
//      readable on a 236px-wide phone thumbnail: headline >= 14px, other text >= 10px there,
//      contrast >= 4.5:1.
// A failing pin is not scheduled as it is: the gate tries the page's other headline lines
// and every layout x palette, and keeps the first version that passes. If none does, the pin
// is dropped and named in a PIN_QUALITY_HOLD note (refill_queue.mjs prints it).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { renderVariant, TEXT_SPEC, PALETTES as COLOURS } from "../build_pin_images.mjs";
import { wrapTitle, pinBoards } from "../../src/lib/pinfeed.mjs";
import { LAYOUTS, PALETTES, copyFor, lineFields } from "./variants.mjs";

export const THUMB_WIDTH = 236;
export const MIN_DISTANCE = 24;
export const RECENT_WINDOW = 9;
export const MIN_HEADLINE_WORDS = 3;
export const MIN_HEADLINE_THUMB_PX = 14;
export const MIN_TEXT_THUMB_PX = 10;
export const MIN_CONTRAST = 4.5;

export async function dHash(png) {
  const w = 17, h = 16;
  const { data } = await sharp(png).grayscale().resize(w, h, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const bits = new Uint8Array((w - 1) * h);
  let k = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) bits[k++] = data[y * w + x] > data[y * w + x + 1] ? 1 : 0;
  return bits;
}
export const distance = (a, b) => a.reduce((s, x, i) => s + (x !== b[i] ? 1 : 0), 0);

const GENERIC = new Set(["kit", "kits", "letter", "letters", "template", "templates", "checklist", "checklists", "guide", "form", "sample", "format", "what", "with", "your", "this", "that", "from", "into", "have", "need", "about", "know", "the", "and", "for", "how", "get", "you", "are", "can", "why", "who", "out", "own", "questions", "com", "every", "one", "all", "each", "more", "time", "same", "new", "use", "own", "here", "start", "first", "need"]);
const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter(Boolean);
const stem = (w) => (w.length >= 5 ? w.slice(0, 5) : w);

let boardsCache = null;
const boards = () => (boardsCache ||= pinBoards(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/pinterest/boards.json"), "utf8"))));

/** The page's own search words: its URL, question/name, and its board's real searches. */
export function topicTerms(v, page = null) {
  const board = boards().boardFor(v.path, v.headline);
  const src = [v.path, v.slug, v.question, page?.searchText, ...(board?.keywords || []), ...(board?.words || [])].join(" ");
  const out = new Set();
  for (const w of words(src)) if (w.length >= 3 && !GENERIC.has(w)) out.add(stem(w));
  return out;
}

export function headlineIssue(v, page = null) {
  const hw = words(v.headline);
  if (hw.length < MIN_HEADLINE_WORDS) return `headline "${v.headline}" has ${hw.length} words, need >= ${MIN_HEADLINE_WORDS} to say what the searcher gets`;
  const terms = topicTerms(v, page);
  if (!hw.some((w) => !GENERIC.has(w) && terms.has(stem(w)))) return `headline "${v.headline}" names none of its page's search words (${[...terms].slice(0, 6).join(", ")}…)`;
  return null;
}

const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

export function thumbnailIssue(v) {
  const spec = TEXT_SPEC[v.layout], pal = COLOURS[v.palette];
  if (!spec || !pal) return `unknown layout ${v.layout} or palette ${v.palette}`;
  const colour = (c) => pal[c] || c;
  const scale = THUMB_WIDTH / 1000;
  for (const [role, r] of Object.entries(spec)) {
    const texts = role === "bullets" ? (v.bullets || []).slice(0, 3) : [v[role]];
    for (const t of texts) {
      const norm = String(t || "").trim().split(/\s+/).join(" ");
      if (!norm) continue;
      const shown = wrapTitle(norm, r.chars, r.lines).join(" ");
      if (shown !== norm || wrapTitle(norm, r.chars, 99).length > r.lines) return `${role} "${norm}" is cut off in ${v.layout} (max ${r.lines} line(s) of ${r.chars} chars)`;
    }
    const px = r.size * scale, floor = role === "headline" ? MIN_HEADLINE_THUMB_PX : MIN_TEXT_THUMB_PX;
    if (px < floor) return `${role} is ${px.toFixed(1)}px on a ${THUMB_WIDTH}px thumbnail, need >= ${floor}px`;
    const cr = contrast(colour(r.fill), colour(r.ground));
    if (cr < MIN_CONTRAST) return `${role} contrast ${cr.toFixed(1)}:1 in ${v.layout}/${v.palette}, need >= ${MIN_CONTRAST}:1`;
  }
  return null;
}

const byDate = (a, b) => (a.releaseDate < b.releaseDate ? -1 : a.releaseDate > b.releaseDate ? 1 : 0);

/**
 * Gate every pin released after `today` (mutates queue.items in place; released pins are
 * never touched). Returns { reworked: [{id, from, to}], held: [{id, reason}] }.
 */
export async function gateQueue(queue, today, { pageFor = () => null, render = renderVariant } = {}) {
  const items = [...queue.items].sort(byDate);
  const hashes = new Map();
  const hashOf = async (v) => { const k = `${v.imageSku}|${v.layout}|${v.palette}|${v.headline}|${v.subhead}|${(v.bullets || []).join("/")}`; if (!hashes.has(k)) hashes.set(k, await dHash(await render(v))); return hashes.get(k); };
  const reworked = [], held = [], kept = [];
  for (const v of items) {
    if (v.releaseDate <= today) { kept.push(v); continue; }
    const recent = await Promise.all(kept.slice(-RECENT_WINDOW).map(hashOf));
    const page = pageFor(v);
    // Other lines of the page's copy, the ones its other pins use least first (no collapse onto one headline).
    const uses = (h) => kept.concat(items).filter((x) => x.slug === v.slug && x.id !== v.id && x.headline === h).length;
    const lines = v.kind === "question" || !page ? [null] : [null, ...copyFor(page).lines.filter((l) => l.headline !== v.headline).sort((a, b) => uses(a.headline) - uses(b.headline))];
    const skins = [[v.layout, v.palette], ...LAYOUTS.flatMap((l) => PALETTES.map((p) => [l, p])).filter(([l, p]) => l !== v.layout || p !== v.palette)];
    let chosen = null, firstReason = null;
    for (const line of lines) {
      const copy = line ? { ...v, ...lineFields(page, line) } : v;
      const h = headlineIssue(copy, page);
      if (h) { firstReason ||= h; continue; }
      // A batch of six never repeats a headline, and no two pins of a page share headline + look.
      const batchOf = (x) => Math.ceil(Number(x.id.split("-v").pop()) / 6);
      const siblings = kept.concat(items.filter((x) => x.releaseDate > v.releaseDate || (x.releaseDate === v.releaseDate && !kept.includes(x)))).filter((x) => x.slug === v.slug && x.id !== v.id);
      if (line && siblings.some((x) => batchOf(x) === batchOf(v) && x.headline === copy.headline)) continue;
      for (const [layout, palette] of skins) {
        const cand = { ...copy, layout, palette };
        if (siblings.some((x) => x.headline === cand.headline && x.layout === layout && x.palette === palette)) continue;
        const t = thumbnailIssue(cand);
        if (t) { firstReason ||= t; continue; }
        const hash = await hashOf(cand);
        const near = recent.map((r) => distance(hash, r)).filter((d) => d < MIN_DISTANCE);
        if (near.length) { firstReason ||= `image only ${Math.min(...near)} bits from a pin released just before it (need >= ${MIN_DISTANCE})`; continue; }
        chosen = cand; break;
      }
      if (chosen) break;
    }
    if (!chosen) { held.push({ id: v.id, reason: firstReason }); continue; }
    if (chosen.headline !== v.headline || chosen.layout !== v.layout || chosen.palette !== v.palette) reworked.push({ id: v.id, from: `${v.layout}/${v.palette} "${v.headline}"`, to: `${chosen.layout}/${chosen.palette} "${chosen.headline}"`, reason: firstReason });
    kept.push(chosen);
  }
  const order = new Map(queue.items.map((v, i) => [v.id, i]));
  queue.items = kept.sort((a, b) => order.get(a.id) - order.get(b.id));
  return { reworked, held };
}

/** Every unreleased pin's verdict, for the drip validator (no rework). */
export async function auditQueue(queue, today, { pageFor = () => null, render = renderVariant } = {}) {
  const items = [...queue.items].sort(byDate);
  const out = [];
  const hs = [];
  for (const v of items) {
    const hash = await dHash(await render(v));
    if (v.releaseDate > today) {
      const issue = headlineIssue(v, pageFor(v)) || thumbnailIssue(v) || (() => { const d = hs.slice(-RECENT_WINDOW).map((r) => distance(hash, r)); const m = d.length ? Math.min(...d) : 999; return m < MIN_DISTANCE ? `image only ${m} bits from a pin released just before it (need >= ${MIN_DISTANCE})` : null; })();
      if (issue) out.push(`${v.id}: ${issue}`);
    }
    hs.push(hash);
  }
  return out;
}
