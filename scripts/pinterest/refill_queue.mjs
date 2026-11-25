#!/usr/bin/env node
// Daily Pinterest drip: keeps data/pinterest/queue.json stocked.
//
//   node scripts/pinterest/refill_queue.mjs           # refill only if needed
//   node scripts/pinterest/refill_queue.mjs --force   # append one batch regardless
//   node scripts/pinterest/refill_queue.mjs --check   # exit 0, print state, write nothing
//
// When fewer than config.REFILL_THRESHOLD variants are unreleased (America/Chicago
// today), appends VARIANTS_PER_PAGE_PER_BATCH new variants for EVERY page in
// pinPages() - the launch pages plus any new active_paid kit or priority guide -
// scheduled PINS_PER_DAY a day from the day after the last queued release, never
// the same page two days running. $0: template copy from variants.mjs, no model.
// Run daily by .github/workflows/pinterest-refill.yml; the commit it pushes to main
// deploys through Cloudflare Pages, which builds the new pin images.
//
// Also, every run (owner-approved 1 Nov 2026):
//   - every live search-loop /questions/ page becomes a pin the day it is found
//     (kind "question", the question itself as headline and title); since 15 Nov 2026 so
//     does every published letter page in the content registries (discoveryPins below), each
//     from its own words, scheduled ahead of the queued repeats;
//   - the Growth-playbook stop rule (pace.mjs): 0 visits at 4 weeks -> new format,
//     8 weeks -> pause, never delete;
//   --start-today  re-date every unreleased pin at PINS_PER_DAY from today, giving
//                  the new topic boards with the most pins waiting today's open slots
//                  (used once, 1 Nov 2026, when the pace went 1 -> 3 a day).
//
// Approval hold (6 Nov 2026): while config.APPROVAL.state is "held", every unreleased pin
// is moved to queue.held (no release date; no feed shows it), new question pins go there too,
// and no batch is appended, so nothing new posts before the owner's yes. The held pins are
// redrawn and gated like any other. releaseHeld() (scripts/pinterest/release_held.mjs, or the
// workflow input release_held) dates them from tomorrow and ends the hold.
import fs from "node:fs";
import path from "node:path";
import { loadPinfeed, loadQueue, QUEUE_FILE, chicagoDate, addDays, scheduleVariants, unreleasedCount, needsRefill, previewImagePath, pinBoards } from "../../src/lib/pinfeed.mjs";
import { applyFallback, applyPause, decidePace } from "./pace.mjs";
import { paidSkusFrom } from "../../src/lib/skuForRoute.mjs";
import { buildVariant, VARIANTS_PER_PAGE_PER_BATCH } from "./variants.mjs";
import { PAPER_TEXT, QUESTION_LAYOUTS, wrapPx } from "./paper_layouts.mjs";
import { gateQueue, SALES_WORDS } from "./quality.mjs";
import { stripTags } from '../lib/html_text.mjs';

const root = process.cwd();
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));

/** Every page that gets pins: launch items first (feed order), then new kits and guides. */
export function pinPages() {
  const feed = loadPinfeed(root);
  const pages = feed.items.map((i) => ({ slug: i.slug, path: i.path, kind: i.kind, imageSku: i.imageSku, name: null, baseDescription: i.description }));
  const seen = new Set(pages.map((p) => p.path.replace(/\/+$/, "")));
  const hasArt = (sku) => fs.existsSync(path.join(root, "public", previewImagePath(sku)));
  // A page joins only once it is published (listed in the committed sitemap).
  const sitemap = fs.readFileSync(path.join(root, "public/sitemap.xml"), "utf8");
  const published = (key) => sitemap.includes(`<loc>https://approvalprep.com${key}/</loc>`);
  const productsJson = readJson("data/products/products.json");
  const products = Array.isArray(productsJson) ? productsJson : (productsJson.products || Object.values(productsJson));
  for (const sku of paidSkusFrom(productsJson)) {
    if (seen.has(`/${sku}`) || !hasArt(sku) || !published(`/${sku}`)) continue;
    const p = products.find((x) => (x.sku || x.slug || x.id) === sku) || {};
    pages.push({ slug: sku, path: `/${sku}/`, kind: "kit", imageSku: sku, name: p.name, outcome: p.outcome, includes: p.includes || [], baseDescription: [p.outcome, "Self-service templates and checklists; you prepare and send your own."].filter(Boolean).join(" ") });
    seen.add(`/${sku}`);
  }
  const priority = readJson("data/content/priority_pages.json").pages || {};
  for (const [p, entry] of Object.entries(priority)) {
    const key = p.replace(/\/+$/, "");
    if (seen.has(key) || !entry.sku || !hasArt(entry.sku) || !published(key)) continue;
    const firstSentences = String(entry.answer || "").split(/(?<=\.)\s+/).slice(0, 2).join(" ");
    pages.push({ slug: key.replace(/^\//, ""), path: `${key}/`, kind: "guide", imageSku: entry.sku, question: entry.question, baseDescription: firstSentences });
    seen.add(key);
  }
  // The page's own search words (the quality gate checks headlines against them): what the
  // page says it is for, from the same data files the page is built from.
  const prio = readJson("data/content/priority_pages.json").pages || {};
  for (const pg of pages) {
    const prod = products.find((x) => (x.sku || x.slug || x.id) === pg.slug) || products.find((x) => (x.sku || x.slug || x.id) === pg.imageSku && pg.kind === "kit") || {};
    const g = prio[pg.path.replace(/\/+$/, "")] || prio[pg.path] || {};
    pg.searchText = [pg.slug, pg.name, pg.question, pg.baseDescription, prod.name, prod.customer_situation, prod.outcome, ...(prod.includes || []), g.target_query, g.question, g.h1, g.metaTitle].filter(Boolean).join(" ");
  }
  return pages;
}

/** Append one batch to `queue` (mutates and returns the new variants). */
export function appendBatch(queue, pages, now = new Date()) {
  const perDay = Number(queue.config.PINS_PER_DAY);
  const items = queue.items;
  const last = items.length ? items.reduce((a, b) => (b.releaseDate > a.releaseDate ? b : a)).releaseDate : null;
  const tomorrow = addDays(chicagoDate(now), 1);
  const floor = queue.config.FIRST_RELEASE_DATE > tomorrow ? queue.config.FIRST_RELEASE_DATE : tomorrow;
  const startDate = last && addDays(last, 1) > floor ? addDays(last, 1) : floor;
  const prevDaySlugs = items.filter((v) => v.releaseDate === addDays(startDate, -1)).map((v) => v.slug);
  const fresh = [];
  pages.forEach((page, pageIndex) => {
    const used = items.filter((v) => v.slug === page.slug).map((v) => Number(v.id.split("-v").pop()));
    const next = used.length ? Math.max(...used) + 1 : 1;
    for (let n = next; n < next + VARIANTS_PER_PAGE_PER_BATCH; n++) { const v = buildVariant(page, n, pageIndex); if (v) fresh.push(v); }
  });
  const scheduled = scheduleVariants(fresh, { startDate, perDay, prevDaySlugs, history: items });
  items.push(...scheduled);
  return scheduled;
}

// ---- Discovery pins (15 Nov 2026): one pin for every published page nothing links to yet ----
// The 1 Nov duty ("every live search-loop /questions/ page becomes a pin the day it is found")
// demanded 5 checklist lines of 4-40 characters, which a question page (prose under <h2>
// sub-questions) never has, so it made zero pins for 14 days. A question page now shows its own
// sub-questions and FAQ questions; a published letter page in the content registries shows the
// opening of its own template. Every word on these pins comes from the page itself; no model.
const decode = (s) => stripTags(String(s || ""), "").replace(/&#39;|&apos;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "vs"]);
const STOP_END = new Set([...SMALL, "is", "are", "do", "does", "can", "you", "your", "i", "my", "what", "how", "when", "if"]);
const ACRONYMS = new Set(["pdf", "sba", "llc", "fha", "va", "irs"]);
const smartTitle = (s) => String(s).split(/\s+/).map((w, i) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** At most 7 words, never ending on a small word or a dangling punctuation mark. */
function trimWords(s, max = 7) {
  const ws = String(s).replace(/[?.!:]+$/, "").split(/\s+/).filter(Boolean).slice(0, max);
  while (ws.length && STOP_END.has(ws.at(-1).toLowerCase().replace(/[^a-z]/g, ""))) ws.pop();
  return ws.join(" ").replace(/[,;:—-]+$/, "").trim();
}
const DROPPABLE_TAIL = new Set(["checklist", "list", "template", "sample", "pdf", "guide", "form"]);
/** A headline that prints uncut (3 lines) in every one of the given layouts. */
const headlineFits = (h, layouts) => layouts.every((l) => wrapPx(h, PAPER_TEXT[l].headline.size, PAPER_TEXT[l].headline.width, PAPER_TEXT[l].headline.face).length <= PAPER_TEXT[l].headline.lines);
/** The candidates that fit; if none does, the longest whole-word cut of `fallback` that fits. */
function fittingHeadlines(cands, fallback, layouts) {
  const ok = [...new Set(cands)].filter((h) => headlineFits(h, layouts));
  if (ok.length) return ok;
  // Cut only at a phrase boundary: the word after the cut is a small word ("for", "with"…), or
  // all that is dropped is a format word ("checklist", "template"…).
  const all = String(fallback).replace(/[?.!:]+$/, "").split(/\s+/).filter(Boolean);
  for (let n = 6; n >= 3; n--) {
    const h = smartTitle(trimWords(fallback, n)), k = h.split(/\s+/).length;
    const boundary = SMALL.has(String(all[k] || "").toLowerCase()) || all.slice(k).every((w) => DROPPABLE_TAIL.has(w.toLowerCase()));
    if (k >= 3 && boundary && headlineFits(h, layouts)) return [h];
  }
  return [];
}
const NOT_SUBQUESTIONS = /^(what the sources say|frequently asked questions|related questions|sources)$/i;

/** A /questions/ page's paper copy, from its own query, headings, FAQ and meta description. */
function questionPage(p) {
  const slug = p.route.replace(/^\/questions\//, "").replace(/\/+$/, "");
  const file = path.join(root, "questions", slug, "index.html");
  if (!fs.existsSync(file)) return { skip: `${p.route}: questions/${slug}/index.html missing` };
  const html = fs.readFileSync(file, "utf8");
  // Either attribute order: the search-loop pages write content= before name=.
  const metaTag = html.match(/<meta\b[^>]*\bname="description"[^>]*>/i)?.[0] || "";
  const meta = decode(metaTag.match(/\bcontent="([^"]*)"/i)?.[1] || "");
  const q = String(p.query || slug.replace(/-/g, " ")).trim().replace(/\?*$/, "");
  const question = `${capFirst(q)}${/^(how|what|when|where|why|who|which|can|do|does|is|are|should|will)\b/i.test(q) ? "?" : ""}`;
  if (!meta) return { skip: `${p.route}: no meta description` };
  if (question.length > 90) return { skip: `${p.route}: question longer than 90 characters` };
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
  // Its own sub-questions (content <h2>s), then its FAQ questions (<h3>s under the FAQ <h2>).
  const heads = [...main.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: m[1], text: decode(m[2]) }));
  const subs = [], faq = [];
  let section = "";
  for (const h of heads) {
    if (h.level === "2") { section = h.text; if (!NOT_SUBQUESTIONS.test(h.text)) subs.push(h.text); }
    else if (/^frequently asked questions$/i.test(section)) faq.push(h.text);
  }
  const spec = PAPER_TEXT[QUESTION_LAYOUTS[0]].body;
  const items = [];
  let lines = 0;
  for (const t of [...subs, ...faq]) {
    if (items.length >= spec.maxItems || items.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    const n = wrapPx(t, spec.size, spec.width, spec.face).length;
    if (n > spec.lines || lines + n > spec.budget) continue;
    items.push(t); lines += n;
  }
  if (items.length < spec.minItems) return { skip: `${p.route}: ${items.length} sub-questions fit a pin, ${spec.minItems} needed` };
  const h1 = decode(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  // Headline candidates, each a whole phrase of the page's own (never cut mid-phrase): the query;
  // the query without its "how to" / "what is a" opener; the page's <h1>; the part of the query
  // after its first "for" ("apartment with no rental history"). Cut to 7 words only if none fits.
  const fits = (h) => { const n = String(h || "").split(/\s+/).filter(Boolean).length; return n >= 3 && n <= 7; };
  const bare = q.match(/^what (?:does|do) (?:a |an |the )?(.+?) (?:look like|mean)$/i)?.[1] || q.replace(/^(how (do|can|should) (i|you) |how to |what (is|are) (a |an |the )?)/i, "");
  const forTail = q.match(/\bfor (.+)$/i)?.[1] || "";
  let cands = [q, bare, h1.replace(/[?.]+$/, "")].filter(fits).map(smartTitle);
  if (!cands.length) cands = [forTail.split(/\s+/).length >= 4 ? forTail : trimWords(q)].filter(fits).map(smartTitle);
  const headlines = fittingHeadlines(cands, q, QUESTION_LAYOUTS);
  if (!headlines.length) return { skip: `${p.route}: no headline of its own words fits the pin` };
  return {
    page: {
      slug: `q-${slug}`, path: `/questions/${slug}/`, kind: "question", imageSku: "complete-approvalprep-bundle", question: q,
      searchText: [q, h1, meta, ...subs].join(" "),
      paperCopy: {
        derived: true, phrases: [q.toLowerCase()], layouts: QUESTION_LAYOUTS, minItems: spec.minItems, cta: "Read the full answer and its sources.",
        headlines, titles: [question.slice(0, 100), `${capFirst(q)}, answered with sources`.slice(0, 100)],
        description: meta.slice(0, 440), checklist: items, letters: [],
      },
    },
  };
}

/** A published letter page's paper copy: the opening of its own template. */
// What the pin promises follows what the page is (registry field `pinKind`, default "letter"): a letter
// page holds a sample to fill in; an address page holds where to mail, not a sample; a notice page
// explains a letter someone sent you and the request letters you can send back (review, 21 Nov 2026).
export const PIN_KINDS = {
  letter: { titles: ["a sample to fill in", "what to write"], cta: "See the full template and what to fill in." },
  address: { titles: ["where to mail it", "what to put in the envelope"], cta: "See the address, its source and what to enclose." },
  notice: { titles: ["what it means", "the letters you can send back"], cta: "See what the notice must tell you, and the free letters." },
};
export function pinTitles(phrase, kind = "letter") {
  const spec = PIN_KINDS[kind];
  if (!spec) throw new Error(`NAMED STOP [PIN_KIND_UNKNOWN] ${kind}`);
  return spec.titles.map((t) => `${capFirst(phrase)}: ${t}`);
}

function letterPage(entry, published) {
  const key = String(entry.path || "").replace(/\/+$/, "");
  if (!key || typeof entry.template !== "string" || !entry.template.trim()) return null;
  if (!published(key)) return { skip: `${key}/: not in the sitemap yet` };
  const slug = key.replace(/^\//, "").replace(/\//g, "-");
  const titleWords = String(entry.title || "").trim();
  // Lower-cased for matching, but a name the title spells with inner capitals keeps them ("TransUnion", "CFPB").
  const spelled = new Map(titleWords.split(/[^A-Za-z0-9]+/).filter((w) => /[A-Z]/.test(w.slice(1))).map((w) => [w.toLowerCase(), w]));
  const phrase = String(entry.targetQuery || entry.title || slug.replace(/-/g, " ")).trim().toLowerCase().replace(/[a-z0-9]+/g, (w) => spelled.get(w) || w);
  const headlines = fittingHeadlines([
    phrase.split(/\s+/).length <= 7 ? smartTitle(phrase) : smartTitle(trimWords(phrase)),
    titleWords && titleWords.split(/\s+/).length <= 7 ? titleWords.replace(/:.*$/, "") : null,
  ].filter((h) => h && h.split(/\s+/).length >= 3), phrase, ["paper-letter", "paper-letter-low", "paper-list", "paper-list-band"]);
  if (!headlines.length) return { skip: `${key}/: no headline of its own words fits the pin` };
  const paras = entry.template.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const base = {
    derived: true, phrases: [phrase], cta: (PIN_KINDS[entry.pinKind || "letter"] || PIN_KINDS.letter).cta, headlines,
    titles: pinTitles(phrase, entry.pinKind),
    description: decode(entry.description || entry.summary || "").slice(0, 440),
  };
  const page = { slug, path: `${key}/`, kind: "guide", imageSku: entry.sku || "complete-approvalprep-bundle", question: entry.targetQuery || entry.title, searchText: [phrase, entry.title, entry.description].filter(Boolean).join(" ") };
  // A form ("Field ......... [value]" lines) shows its own field names as a checklist.
  const fields = entry.template.split("\n").map((l) => l.match(/^\s*(.+?)\s*\.{2,}/)?.[1]?.trim()).filter((f) => f && f.length >= 4 && f.length <= 40);
  if (fields.length >= 5) return { page: { ...page, paperCopy: { ...base, checklist: fields.slice(0, 8), letters: [] } } };
  // A letter: its Re:/Subject: line, its greeting (or the addressee line), its first paragraphs.
  const lineOf = (re) => { for (let i = 0; i < paras.length; i++) { const l = paras[i].split("\n").find((x) => re.test(x.trim())); if (l) return { i, text: l.trim() }; } return null; };
  const reLine = lineOf(/^(re|subject):/i);
  const greet = lineOf(/^(dear|to|hello|hi)\b.*[,:]$/i);
  let greeting = greet?.text;
  if (!greeting && reLine) greeting = paras[reLine.i].split("\n").map((x) => x.trim()).find((x) => x && !/^(re|subject):/i.test(x)) || (reLine.i > 0 ? paras[reLine.i - 1].split("\n")[0].trim() : null);
  if (!greeting || /^\[date\]$/i.test(greeting)) return { skip: `${key}/: template has no greeting or addressee line` };
  const after = Math.max(reLine?.i ?? -1, greet?.i ?? -1);
  // Whole paragraphs only, stopping before one the pin may not show (a sales word, e.g. "truthful").
  const body = [];
  for (const x of paras.slice(after + 1).map((y) => y.split("\n").map((l) => l.trim()).join(" ")).filter((y) => y.length >= 12)) {
    if (body.length >= 3) break;
    if (SALES_WORDS.some((re) => re.test(x))) {
      // Keep the whole sentences before the one the pin may not show, then stop.
      const kept = [];
      for (const sentence of x.split(/(?<=[.?!])\s+/)) { if (SALES_WORDS.some((re) => re.test(sentence))) break; kept.push(sentence); }
      if (kept.length) body.push(kept.join(" "));
      break;
    }
    body.push(x);
  }
  if (!body.length) return { skip: `${key}/: template has no paragraph after its greeting` };
  const letter = { re: reLine?.text || `Re: ${entry.title}`, greeting, body };
  return { page: { ...page, paperCopy: { ...base, checklist: [], letters: [{ ...letter, headlines, titles: base.titles }] } } };
}

/** Every page the discovery lane covers: live /questions/ pages and published registry letter pages. */
export function discoveryPages({ log = () => {} } = {}) {
  const sitemap = fs.readFileSync(path.join(root, "public/sitemap.xml"), "utf8");
  const published = (key) => sitemap.includes(`<loc>https://approvalprep.com${key}/</loc>`);
  const ledger = fs.existsSync(path.join(root, "data/search-loop/pages.json")) ? readJson("data/search-loop/pages.json") : { pages: [] };
  const qs = [], letters = [];
  for (const p of ledger.pages || []) {
    if (p?.status !== "live" || typeof p.route !== "string" || !p.route.startsWith("/questions/")) continue;
    const r = questionPage(p);
    if (r.skip) log(`DISCOVERY_PIN_SKIPPED ${r.skip}`); else qs.push(r.page);
  }
  const kitPaths = new Set(pinPages().map((pg) => pg.path));
  for (const f of LETTER_REGISTRIES) {
    if (!fs.existsSync(path.join(root, f))) continue;
    for (const e of readJson(f).pages || []) {
      const r = letterPage(e, published);
      if (!r || kitPaths.has(`${String(e.path).replace(/\/+$/, "")}/`)) continue;
      if (r.skip) log(`DISCOVERY_PIN_SKIPPED ${r.skip}`); else letters.push(r.page);
    }
  }
  // Interleaved, so two pins in a row rarely share a layout (the quality gate's look check).
  const out = [];
  for (let i = 0; i < Math.max(qs.length, letters.length); i++) { if (qs[i]) out.push(qs[i]); if (letters[i]) out.push(letters[i]); }
  return out;
}
export const LETTER_REGISTRIES = ["data/content/demand_coverage_pages.json", "data/content/seo_recovery_pages.json"];

/** One new pin for every discovery page that has no pin (queued, released or held) yet. */
export function discoveryPins(queue, today, opts = {}) {
  const linked = new Set([...(queue.items || []), ...(queue.held || [])].map((v) => v.path));
  const out = [];
  for (const page of discoveryPages(opts)) {
    if (linked.has(page.path)) continue;
    const v = buildVariant(page, 1);
    if (v) out.push({ ...v, phrases: page.paperCopy.phrases, discovery: true, releaseDate: today });
  }
  return out;
}

/** Every page the quality gate may need to rework a pin: the drip pages and the discovery pages. */
export const gatePages = () => [...pinPages(), ...discoveryPages()];

/** Re-date every unreleased pin from tomorrow, discovery pins first (they link pages nothing else does). */
export function redateLater(queue, today) {
  const later = queue.items.filter((v) => v.releaseDate > today).sort((a, b) => (a.releaseDate < b.releaseDate ? -1 : a.releaseDate > b.releaseDate ? 1 : 0));
  queue.items = queue.items.filter((v) => v.releaseDate <= today);
  const prev = queue.items.filter((v) => v.releaseDate === today).map((v) => v.slug);
  const first = new Set(later.filter((v) => v.discovery).map((v) => v.slug));
  const scheduled = scheduleVariants(later, { startDate: addDays(today, 1), perDay: Number(queue.config.PINS_PER_DAY), prevDaySlugs: prev, history: queue.items, first });
  queue.items.push(...scheduled);
  return scheduled;
}

/**
 * Run the pin quality gate (scripts/pinterest/quality.mjs) over every unreleased pin. A pin
 * that cannot be made good is dropped; the pins after it are re-dated so the schedule keeps
 * no gaps, and the gate runs again on the new order (at most 3 passes).
 */
export async function gateAndReschedule(queue, today) {
  const pages = new Map(gatePages().map((p) => [p.slug, p]));
  const all = { reworked: [], held: [] };
  for (let pass = 0; pass < 3; pass++) {
    const r = await gateQueue(queue, today, { pageFor: (v) => pages.get(v.slug) || null });
    all.reworked.push(...r.reworked); all.held.push(...r.held);
    if (!r.held.length) break;
    redateLater(queue, today);
  }
  // A discovery page whose every pin version fails the gate keeps a named record (queue.qualityHeld),
  // so the drip validator sees a recorded PIN_QUALITY_HOLD instead of a page silently left unpinned.
  // Each refill tries the page again and replaces its record; a page that gets a pin loses it.
  const linkedNow = new Set([...(queue.items || []), ...(queue.held || [])].map((v) => v.path));
  const fresh = all.held.filter((h) => h.discovery && h.path && !linkedNow.has(h.path));
  const prior = (queue.qualityHeld || []).filter((h) => !linkedNow.has(h.path) && !fresh.some((f) => f.path === h.path));
  queue.qualityHeld = [...prior, ...fresh.map((h) => ({ path: h.path, id: h.id, reason: h.reason, heldOn: today }))];
  if (!queue.qualityHeld.length) delete queue.qualityHeld;
  for (const w of all.reworked) console.log(`[pin-quality] reworked ${w.id}: ${w.from} -> ${w.to} (${w.reason})`);
  if (all.held.length) {
    const note = `${all.held.length} pin(s) held, no version passed the quality gate: ${all.held.map((h) => `${h.id} (${h.reason})`).join("; ")}`;
    console.log(`PIN_QUALITY_HOLD: ${note}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=PIN_QUALITY_HOLD::${note}`);
  }
  return all;
}

export const isHeld = (queue) => queue?.config?.APPROVAL?.state === "held";

/** Approval hold: every unreleased pin leaves the schedule into queue.held. Returns how many moved. */
export function holdUnreleased(queue, today) {
  const later = queue.items.filter((v) => v.releaseDate > today);
  queue.items = queue.items.filter((v) => v.releaseDate <= today);
  queue.held = [...(queue.held || []), ...later.map((v) => ({ ...v, releaseDate: null }))];
  return later.length;
}

/** The owner's yes: date every held pin from tomorrow (PINS_PER_DAY, spread rule) and end the hold. */
export function releaseHeld(queue, today) {
  const held = queue.held || [];
  const later = queue.items.filter((v) => v.releaseDate > today);
  queue.items = queue.items.filter((v) => v.releaseDate <= today);
  const prev = queue.items.filter((v) => v.releaseDate === today).map((v) => v.slug);
  const all = [...later, ...held.map((v) => ({ ...v, releaseDate: null }))];
  const scheduled = scheduleVariants(all, { startDate: addDays(today, 1), perDay: Number(queue.config.PINS_PER_DAY), prevDaySlugs: prev, history: queue.items, first: new Set(all.filter((v) => v.discovery).map((v) => v.slug)) });
  queue.items.push(...scheduled);
  queue.held = [];
  queue.config.APPROVAL = { ...(queue.config.APPROVAL || {}), state: "released", released_at: today };
  return scheduled;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Set(process.argv.slice(2));
  const queue = loadQueue(root);
  const now = process.env.PINFEED_NOW ? new Date(process.env.PINFEED_NOW) : new Date();
  const today = chicagoDate(now);
  let changed = false;
  if (args.has("--check")) {
    console.log(`[pinterest-refill] ${unreleasedCount(queue, now)} unreleased, threshold ${queue.config.REFILL_THRESHOLD}: ${needsRefill(queue, now) ? "REFILL DUE" : "stocked"}`);
    process.exit(0);
  }
  // The stop rule.
  const metrics = fs.existsSync(path.join(root, "data/pinterest/metrics.json")) ? readJson("data/pinterest/metrics.json") : null;
  const pace = decidePace(queue.config, metrics, today);
  if (pace.action === "fallback") { applyFallback(queue, today, pace.reason); changed = true; console.log(`[pinterest-refill] PACE new format: ${pace.reason}`); }
  if (pace.action === "pause") {
    applyPause(queue, today, pace.reason); changed = true;
    console.log(`NAMED STOP: PINTEREST_PAUSED - ${pace.reason}; no new pins released, published pins stay (Growth playbook: 8 weeks at 0 -> pause, never delete).`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=PINTEREST_PAUSED::${pace.reason}`);
  }
  const paused = pace.action === "pause";
  // --start-today: re-date the unreleased pins at the current pace from today.
  if (args.has("--start-today")) {
    const boards = pinBoards(readJson("data/pinterest/boards.json"));
    const later = queue.items.filter((v) => v.releaseDate > today).sort((a, b) => (a.releaseDate < b.releaseDate ? -1 : a.releaseDate > b.releaseDate ? 1 : 0));
    queue.items = queue.items.filter((v) => v.releaseDate <= today);
    const onDay = (d) => queue.items.filter((v) => v.releaseDate === d);
    const yesterday = new Set(onDay(addDays(today, -1)).map((v) => v.slug));
    const waiting = (slug) => later.filter((v) => boards.boardFor(v.path).slug === slug).length;
    const boardsToday = new Set(onDay(today).map((v) => boards.boardFor(v.path).slug));
    for (const board of [...boards.BOARDS.slice(1)].sort((a, b) => waiting(b.slug) - waiting(a.slug))) {
      if (onDay(today).length >= queue.config.PINS_PER_DAY) break;
      if (boardsToday.has(board.slug)) continue;
      const i = later.findIndex((v) => boards.boardFor(v.path).slug === board.slug && !yesterday.has(v.slug) && !onDay(today).some((t) => t.slug === v.slug));
      if (i >= 0) { queue.items.push({ ...later.splice(i, 1)[0], releaseDate: today }); boardsToday.add(board.slug); }
    }
    const scheduled = scheduleVariants(later, { startDate: addDays(today, 1), perDay: Number(queue.config.PINS_PER_DAY), prevDaySlugs: onDay(today).map((v) => v.slug), history: queue.items });
    queue.items.push(...scheduled);
    changed = true;
    console.log(`[pinterest-refill] re-dated ${scheduled.length} unreleased pins at ${queue.config.PINS_PER_DAY}/day from ${addDays(today, 1)}; today: ${onDay(today).map((v) => v.id).join(", ")}`);
  }
  // Approval hold: nothing unreleased stays scheduled until the owner's yes.
  const holding = isHeld(queue);
  if (holding) { const moved = holdUnreleased(queue, today); if (moved) { changed = true; console.log(`[pinterest-refill] held ${moved} unreleased pin(s) for approval`); } }
  // Discovery pins: every live question page and published letter page with no pin yet, dated
  // ahead of the queued repeats (held too while the hold is on).
  const fresh = paused ? [] : discoveryPins(queue, addDays(today, 1), { log: (m) => console.log(`[pinterest-refill] ${m}`) });
  if (fresh.length) {
    if (holding) (queue.held ||= []).push(...fresh.map((q) => ({ ...q, releaseDate: null })));
    else { queue.items.push(...fresh); redateLater(queue, today); }
    changed = true;
    console.log(`[pinterest-refill] discovery pins${holding ? " (held)" : ""}: ${fresh.length} - ${fresh.map((q) => q.path).join(", ")}`);
  }
  const left = unreleasedCount(queue, now);
  {
    const g = await gateAndReschedule(queue, today);
    if (g.reworked.length || g.held.length) changed = true;
  }
  if (holding) {
    fs.writeFileSync(path.join(root, QUEUE_FILE), JSON.stringify(queue, null, 2) + "\n");
    const note = `${(queue.held || []).length} redrawn pin(s) wait for the owner's approval (${queue.config.APPROVAL.sample || "sample page"}); no pin is scheduled and no batch is added until then. Release: gh workflow run pinterest-refill.yml -R seq23/approvalprep -f release_held=true`;
    console.log(`HELD_FOR_APPROVAL: ${note}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=HELD_FOR_APPROVAL::${note}`);
    process.exit(0);
  }
  const due = !paused && needsRefill(queue, now);
  if (!due && !args.has("--force")) {
    if (changed) fs.writeFileSync(path.join(root, QUEUE_FILE), JSON.stringify(queue, null, 2) + "\n");
    console.log(`[pinterest-refill] stocked: ${left} unreleased >= ${queue.config.REFILL_THRESHOLD}; ${changed ? "queue updated" : "nothing written"}`);
    process.exit(0);
  }
  // --seed: the launch pages only (the first batch, 16 Oct 2026).
  const pages = args.has("--seed") ? pinPages().filter((p) => loadPinfeed(root).items.some((i) => i.slug === p.slug)) : pinPages();
  if (!pages.length) { console.error("[pinterest-refill] FAIL no pages to pin"); process.exit(1); }
  const added = appendBatch(queue, pages, now);
  if (!added.length) { console.error("[pinterest-refill] FAIL refill due but no variants generated"); process.exit(1); }
  const addedIds = new Set(added.map((v) => v.id));
  await gateAndReschedule(queue, today);
  const kept = queue.items.filter((v) => addedIds.has(v.id));
  if (!kept.length) { console.error("NAMED STOP: PIN_QUALITY_HOLD - a refill was due but every new pin failed the quality gate; nothing scheduled (see the reasons above)."); process.exit(1); }
  fs.writeFileSync(path.join(root, QUEUE_FILE), JSON.stringify(queue, null, 2) + "\n");
  console.log(`[pinterest-refill] OK appended ${kept.length} of ${added.length} variants (quality gate) for ${pages.length} pages, ${kept[0].releaseDate} to ${kept.at(-1).releaseDate}; ${unreleasedCount(queue, now)} unreleased`);
}
