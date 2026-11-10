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
//     (kind "question", the question itself as headline and title);
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
import { buildVariant, VARIANTS_PER_PAGE_PER_BATCH, boards as pinBoardsCfg } from "./variants.mjs";
import { gateQueue } from "./quality.mjs";

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

/** Live search-loop question pages as pins (one each), not yet in the queue. */
export function questionPins(queue, today) {
  const ledger = fs.existsSync(path.join(root, "data/search-loop/pages.json")) ? readJson("data/search-loop/pages.json") : { pages: [] };
  const have = new Set(queue.items.map((v) => v.id));
  const out = [];
  for (const p of ledger.pages || []) {
    if (p?.status !== "live" || typeof p.route !== "string" || !p.route.startsWith("/questions/")) continue;
    const slug = p.route.replace(/^\/questions\//, "").replace(/\/+$/, "");
    const id = `q-${slug}-v1`;
    if (have.has(id)) continue;
    const file = path.join(root, "questions", slug, "index.html");
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    // Either attribute order: the search-loop pages write content= before name= (until 6 Nov
    // 2026 this only matched name-first, so no question page ever became a pin).
    const metaTag = html.match(/<meta\b[^>]*\bname="description"[^>]*>/i)?.[0] || "";
    const meta = (metaTag.match(/\bcontent="([^"]*)"/i)?.[1] || "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
    const q = String(p.query || slug.replace(/-/g, " ")).trim().replace(/\?*$/, "");
    const question = `${q.charAt(0).toUpperCase()}${q.slice(1)}${/^(how|what|when|where|why|who|which|can|do|does|is|are|should|will)\b/i.test(q) ? "?" : ""}`;
    if (!meta || question.length > 90) continue;
    // Paper format: the page's own checklist lines (its list items), 5 to 8 of them; a page
    // with fewer has nothing to show on a pin and is skipped (named below).
    const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
    const items = [...main.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim()).filter((x) => x.length >= 4 && x.length <= 40);
    if (items.length < 5) { console.log(`[pinterest-refill] QUESTION_PIN_SKIPPED ${p.route}: ${items.length} short checklist lines on the page, 5 needed`); continue; }
    const board = pinBoardsCfg().boardFor(`/questions/${slug}/`, q);
    const phrase = q.charAt(0).toUpperCase() + q.slice(1);
    const headline = phrase.split(/\s+/).length <= 7 ? phrase.replace(/\b\w/g, (c) => c.toUpperCase()) : phrase.split(/\s+/).slice(0, 7).join(" ");
    out.push({
      id, slug: `q-${slug}`, path: `/questions/${slug}/`, kind: "question", imageSku: "complete-approvalprep-bundle", format: "paper",
      angle: "list-first", layout: "paper-list", palette: board.accent, phrases: [q.toLowerCase()],
      headline, subhead: items[0], items: items.slice(0, 8),
      title: question.slice(0, 100), description: meta.slice(0, 440), releaseDate: today,
    });
  }
  return out;
}

/**
 * Run the pin quality gate (scripts/pinterest/quality.mjs) over every unreleased pin. A pin
 * that cannot be made good is dropped; the pins after it are re-dated so the schedule keeps
 * no gaps, and the gate runs again on the new order (at most 3 passes).
 */
export async function gateAndReschedule(queue, today) {
  const pages = new Map(pinPages().map((p) => [p.slug, p]));
  const all = { reworked: [], held: [] };
  for (let pass = 0; pass < 3; pass++) {
    const r = await gateQueue(queue, today, { pageFor: (v) => pages.get(v.slug) || null });
    all.reworked.push(...r.reworked); all.held.push(...r.held);
    if (!r.held.length) break;
    const later = queue.items.filter((v) => v.releaseDate > today).sort((a, b) => (a.releaseDate < b.releaseDate ? -1 : a.releaseDate > b.releaseDate ? 1 : 0));
    queue.items = queue.items.filter((v) => v.releaseDate <= today);
    const prev = queue.items.filter((v) => v.releaseDate === today).map((v) => v.slug);
    queue.items.push(...scheduleVariants(later, { startDate: addDays(today, 1), perDay: Number(queue.config.PINS_PER_DAY), prevDaySlugs: prev, history: queue.items }));
  }
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
  const scheduled = scheduleVariants([...later, ...held.map((v) => ({ ...v, releaseDate: null }))], { startDate: addDays(today, 1), perDay: Number(queue.config.PINS_PER_DAY), prevDaySlugs: prev, history: queue.items });
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
  // Question pages from the search loop (held too while the hold is on).
  const questions = paused ? [] : questionPins(queue, today);
  if (questions.length) { (holding ? (queue.held ||= []) : queue.items).push(...questions.map((q) => (holding ? { ...q, releaseDate: null } : q))); changed = true; console.log(`[pinterest-refill] question pins${holding ? " (held)" : ""}: ${questions.map((q) => q.path).join(", ")}`); }
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
