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
// Paper format (6 Nov 2026 Pinterest review), on every pin not yet released or held:
//   4. NO PRODUCT BOX: a legacy layout (the kit's box art) is refused and redrawn on paper.
//   5. NO SALES WORDS: "self-service", "instant download", "one download", "kit", "bundle",
//      "truthful", "downloadable" or a price anywhere in the image text, title or description.
//   6. TITLE: no "| Kit name" ending, no "Save this:" / "Read this first:", and it starts with
//      a searched phrase (the page's PIN_COPY phrases, its board's Pinterest searches, or a
//      question page's own query).
//   7. LINK: a pin on a kit page names a template and promises no guide.
//   8. ART: cream paper, carbon text and its board's one accent colour; a photo pin only with a
//      free-licence photo (Unsplash free licence, never Unsplash+, Pexels or Pixabay), >= 1000px
//      wide, no watermark, photographer + link + licence recorded (data/pinterest/photos.json).
// A failing pin is not scheduled as it is: the gate tries the page's other headline lines
// and every layout x palette, and keeps the first version that passes. If none does, the pin
// is dropped and named in a PIN_QUALITY_HOLD note (refill_queue.mjs prints it).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { renderVariant, TEXT_SPEC, PALETTES as COLOURS } from "../build_pin_images.mjs";
import { wrapTitle, pinBoards } from "../../src/lib/pinfeed.mjs";
import { paperCopyFor, paperSlots, paperFields, buildPaperVariant } from "./variants.mjs";
import { isPaper, PAPER_TEXT, FORMAT_OF, ACCENTS, CARBON, SHEET, wrapPx, letterLines } from "./paper_layouts.mjs";

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
export const boards = () => (boardsCache ||= pinBoards(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/pinterest/boards.json"), "utf8"))));

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

export const MAX_HEADLINE_WORDS = 7;
export const SALES_WORDS = [/\bself[- ]service\b/i, /\binstant download/i, /\bone download\b/i, /\bkits?\b/i, /\bbundles?\b/i, /\btruthful\b/i, /\bdownloadable\b/i, /\$\s?\d/, /\b\d+(\.\d\d)?\s?(usd|dollars)\b/i];
export const BANNED_OPENERS = [/^save this\b/i, /^read this first\b/i];
export const PHOTO_LICENCES = { unsplash: /^https:\/\/unsplash\.com\/photos\//, pexels: /^https:\/\/www\.pexels\.com\/photo\//, pixabay: /^https:\/\/pixabay\.com\// };
export const MIN_PHOTO_WIDTH = 1000;

const pinText = (v) => [v.headline, v.subhead, v.title, v.description, ...(v.items || []), ...(v.letter ? [v.letter.re, v.letter.greeting, ...v.letter.body] : [])].filter(Boolean).map(String);

export function boxIssue(v) { return isPaper(v) ? null : `shows the product box (${v.layout}), not the letter or checklist itself`; }

export function salesIssue(v) {
  for (const text of pinText(v)) for (const re of SALES_WORDS) if (re.test(text)) return `sales words on the pin ("${text.match(re)[0]}" in "${text.slice(0, 60)}")`;
  return null;
}

/** The phrases a pin's title may start with. */
export function allowedPhrases(v, page = null) {
  const board = boards().boardFor(v.path, v.headline);
  return [...(page ? paperCopyFor(page)?.phrases || [] : []), ...(v.phrases || []), ...(board?.keywords || [])].map((p) => p.toLowerCase());
}

export function titleIssue(v, page = null) {
  const title = String(v.title || "").trim();
  if (title.includes("|")) return `title "${title}" ends in a product name`;
  if (BANNED_OPENERS.some((re) => re.test(title))) return `title "${title}" opens with a filler phrase`;
  const phrases = allowedPhrases(v, page);
  if (!phrases.some((p) => title.toLowerCase().startsWith(p))) return `title "${title}" does not start with a searched phrase (${phrases.slice(0, 4).join(" / ")}…)`;
  if (title.length > 100) return `title ${title.length} chars > 100`;
  return null;
}

export function linkIssue(v) {
  if (v.kind !== "kit") return null;
  if (!/\btemplates?\b/i.test(v.title)) return `title "${v.title}" links to a kit page but names no template`;
  if (/\b(guide|explained|step by step|how it works)\b|^how to\b/i.test(v.title)) return `title "${v.title}" promises a guide but links to a kit page`;
  return null;
}

export function artIssue(v) {
  const board = boards().boardFor(v.path, v.headline);
  if (!ACCENTS[v.palette]) return `palette ${v.palette} is not a paper accent`;
  if (board?.accent !== v.palette) return `accent ${v.palette} is not ${board?.slug}'s one accent (${board?.accent})`;
  const words = String(v.headline || "").trim().split(/\s+/).length;
  if (words > MAX_HEADLINE_WORDS) return `headline "${v.headline}" has ${words} words, ${MAX_HEADLINE_WORDS} at most on the image`;
  return null;
}

/** Text fits uncut and reads at a 236px thumbnail (paper layouts). */
export function paperThumbIssue(v) {
  const spec = PAPER_TEXT[v.layout];
  if (!spec) return `unknown paper layout ${v.layout}`;
  const scale = THUMB_WIDTH / 1000;
  const hl = wrapPx(v.headline, spec.headline.size, spec.headline.width, spec.headline.face);
  if (hl.length > spec.headline.lines) return `headline "${v.headline}" is cut off in ${v.layout} (${hl.length} lines > ${spec.headline.lines})`;
  if (spec.headline.size * scale < MIN_HEADLINE_THUMB_PX) return `headline is ${(spec.headline.size * scale).toFixed(1)}px on a ${THUMB_WIDTH}px thumbnail`;
  const tint = ACCENTS[v.palette]?.tint || SHEET;
  if (contrast(CARBON, tint) < MIN_CONTRAST || contrast(CARBON, SHEET) < MIN_CONTRAST) return `text contrast below ${MIN_CONTRAST}:1 on ${v.palette}`;
  const fmt = FORMAT_OF[v.layout];
  if (fmt === "photo") return null;
  if (spec.body.size * scale < MIN_TEXT_THUMB_PX) return `body text is ${(spec.body.size * scale).toFixed(1)}px on a ${THUMB_WIDTH}px thumbnail`;
  if (fmt === "list") {
    const items = v.items || [];
    if (items.length < spec.body.minItems || items.length > spec.body.maxItems) return `${items.length} checklist lines, need ${spec.body.minItems} to ${spec.body.maxItems}`;
    let total = 0;
    for (const it of items) { const w = wrapPx(it, spec.body.size, spec.body.width, spec.body.face); if (w.length > spec.body.lines) return `checklist line "${it}" is cut off (${w.length} lines > ${spec.body.lines})`; total += w.length; }
    if (total > spec.body.budget) return `checklist runs to ${total} lines, ${spec.body.budget} fit`;
    return null;
  }
  if (!v.letter?.re || !v.letter?.greeting || !(v.letter.body || []).length) return "letter layout without a full letter opening";
  const lines = letterLines(v.letter, spec.body).filter((l) => !l.gap).length;
  if (lines < spec.body.minLines) return `letter opening shows ${lines} lines, need >= ${spec.body.minLines}`;
  return null;
}

let photosCache = null;
const photos = () => (photosCache ||= JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/pinterest/photos.json"), "utf8")));
/** A photo pin's photo must be free-licensed, credited, >= 1000px wide and unwatermarked. */
export async function photoIssue(v, manifest = null, dir = path.join(process.cwd(), "public", "pins", "photos")) {
  if (FORMAT_OF[v.layout] !== "photo") return null;
  manifest ||= photos();
  const p = (manifest.photos || []).find((x) => x.file === v.photo);
  if (!p) return `photo ${v.photo} is not in data/pinterest/photos.json`;
  const re = PHOTO_LICENCES[p.licence];
  if (!re) return `photo ${p.file}: licence "${p.licence}" is not unsplash, pexels or pixabay`;
  if (!re.test(p.source_url || "") || /plus\.unsplash|unsplash\+|premium/i.test(`${p.source_url} ${p.notes || ""}`)) return `photo ${p.file}: source ${p.source_url} is not a free ${p.licence} photo page`;
  if (!String(p.photographer || "").trim() || !/^https:\/\//.test(p.photographer_url || "")) return `photo ${p.file}: photographer and link not recorded`;
  if (p.watermark !== false) return `photo ${p.file}: watermark not checked (watermark must be false)`;
  const file = path.join(dir, p.file);
  if (!fs.existsSync(file)) return `photo ${p.file}: file missing`;
  const { width } = await sharp(file).metadata();
  if (!(width >= MIN_PHOTO_WIDTH)) return `photo ${p.file}: ${width}px wide, need >= ${MIN_PHOTO_WIDTH}`;
  return null;
}

/** Every content rule for one new pin (null when it passes). */
export async function pinIssue(v, page = null) {
  return boxIssue(v) || salesIssue(v) || titleIssue(v, page) || linkIssue(v) || artIssue(v) || headlineIssue(v, page) || paperThumbIssue(v) || (await photoIssue(v));
}

const byDate = (a, b) => (a.releaseDate < b.releaseDate ? -1 : a.releaseDate > b.releaseDate ? 1 : 0);
const vnum = (x) => Number(String(x.id).split("-v").pop());
const batchOf = (x) => Math.ceil(vnum(x) / 6);

/**
 * Gate `list` (new pins in planned order) after `context` (pins already released, in order).
 * A product-box pin is redrawn on paper; a pin that fails tries the page's other titles and
 * looks; if none passes it is dropped. Returns { kept, reworked, held }.
 */
async function gateList(list, context, { pageFor, render }) {
  const hashes = new Map();
  const hashOf = async (v) => { const k = JSON.stringify([v.layout, v.palette, v.headline, v.items, v.letter, v.imageSku, v.subhead, v.bullets]); if (!hashes.has(k)) hashes.set(k, await dHash(await render(v))); return hashes.get(k); };
  const kept = [], reworked = [], held = [];
  const done = [...context];
  for (const v0 of list) {
    const page = pageFor(v0);
    const recent = await Promise.all(done.slice(-RECENT_WINDOW).map(hashOf));
    let firstReason = isPaper(v0) ? null : boxIssue(v0);
    const base = isPaper(v0) ? v0 : (page && buildPaperVariant(page, vnum(v0)) && { ...v0, ...buildPaperVariant(page, vnum(v0)), releaseDate: v0.releaseDate, id: v0.id }) || v0;
    const cands = [base];
    if (page && paperCopyFor(page)) {
      const copy = paperCopyFor(page), slots = paperSlots(page);
      for (let ti = 0; ti < copy.titles.length; ti++) for (const slot of slots) cands.push({ ...base, ...paperFields(page, ti, slot) });
    }
    const siblings = [...done, ...kept].filter((x) => x.slug === v0.slug && x.id !== v0.id);
    let chosen = null;
    for (const c of cands) {
      const issue = await pinIssue(c, page);
      if (issue) { firstReason ||= issue; continue; }
      if (siblings.some((x) => x.headline === c.headline && x.layout === c.layout && x.palette === c.palette)) continue;
      if (siblings.some((x) => isPaper(x) && batchOf(x) === batchOf(c) && x.title === c.title)) continue;
      const hash = await hashOf(c);
      const near = recent.map((r) => distance(hash, r)).filter((d) => d < MIN_DISTANCE);
      if (near.length) { firstReason ||= `image only ${Math.min(...near)} bits from a pin just before it (need >= ${MIN_DISTANCE})`; continue; }
      chosen = c; break;
    }
    if (!chosen) { held.push({ id: v0.id, reason: firstReason || "no distinct version left" }); continue; }
    if (chosen.layout !== v0.layout || chosen.title !== v0.title || chosen.headline !== v0.headline) reworked.push({ id: v0.id, from: `${v0.layout}/${v0.palette} "${v0.title}"`, to: `${chosen.layout}/${chosen.palette} "${chosen.title}"`, reason: firstReason });
    kept.push(chosen); done.push(chosen);
  }
  return { kept, reworked, held };
}

/**
 * Gate every pin released after `today` and every held pin (mutates queue; released pins are
 * never touched). Returns { reworked: [{id, from, to}], held: [{id, reason}] } — "held" here
 * means dropped: no version passed.
 */
export async function gateQueue(queue, today, { pageFor = () => null, render = renderVariant } = {}) {
  const sorted = [...queue.items].sort(byDate);
  const released = sorted.filter((v) => v.releaseDate <= today);
  const later = sorted.filter((v) => v.releaseDate > today);
  const a = await gateList(later, released, { pageFor, render });
  const b = await gateList(queue.held || [], [...released, ...a.kept], { pageFor, render });
  const order = new Map(queue.items.map((v, i) => [v.id, i]));
  queue.items = [...released, ...a.kept].sort((x, y) => order.get(x.id) - order.get(y.id));
  if (queue.held) queue.held = b.kept;
  return { reworked: [...a.reworked, ...b.reworked], held: [...a.held, ...b.held] };
}

/** Every unreleased and held pin's verdict, for the drip validator (no rework). */
export async function auditQueue(queue, today, { pageFor = () => null, render = renderVariant } = {}) {
  const out = [];
  const hs = [];
  const seq = [...[...queue.items].sort(byDate), ...(queue.held || [])];
  for (const v of seq) {
    const hash = await dHash(await render(v));
    if (v.releaseDate === null || v.releaseDate === undefined || v.releaseDate > today) {
      const issue = (await pinIssue(v, pageFor(v))) || (() => { const d = hs.slice(-RECENT_WINDOW).map((r) => distance(hash, r)); const m = d.length ? Math.min(...d) : 999; return m < MIN_DISTANCE ? `image only ${m} bits from a pin just before it (need >= ${MIN_DISTANCE})` : null; })();
      if (issue) out.push(`${v.id}: ${issue}`);
    }
    hs.push(hash);
  }
  return out;
}
