#!/usr/bin/env node
// Daily Pinterest drip (owner-approved 16 Oct 2026). Runs after the build. Fails if:
// 1. data/pinterest/queue.json breaks its schema: config (PINS_PER_DAY integer >= 1,
//    FIRST_RELEASE_DATE, MAX_FEED_ITEMS, REFILL_THRESHOLD), or any item lacks a unique
//    <slug>-v<n> id, a known angle/layout/palette, headline, subhead, title <= 100,
//    description <= 500, a YYYY-MM-DD releaseDate on/after FIRST_RELEASE_DATE, or
//    carries a price ($ amount) in its copy;
// 2. a launch page has fewer than 5 variants, or two variants of one page share
//    headline + layout + palette;
// 3. a day carries more than PINS_PER_DAY pins, the schedule has a gap, or the same
//    page is released on two consecutive days (or twice in one day);
// 4. a variant link is off-site, lacks any of the four utm params (utm_content = its
//    id), or points at a page the build did not emit;
// 5. a variant's dist/pins/<id>.png is missing or not 1000x1500;
// 6. the feed at a fixed clock does not show exactly the launch items plus the
//    variants due by that America/Chicago date (newest MAX_FEED_ITEMS), including
//    the midnight-CT boundary;
// 7. the refill rule is off: needsRefill must flip at REFILL_THRESHOLD, a refill
//    batch must cover every page, continue the variant numbering and keep the
//    no-consecutive-page rule across the batch boundary; the live queue must not be
//    starved (< 7 unreleased = the daily refill has been failing for a week);
// 8. the request-time Pages Function is not wired to both data files;
// 9. the pin quality gate (scripts/pinterest/quality.mjs) is off: an unreleased built pin
//    looks like one released just before it, has a headline without its page's search
//    words, or text cut off / unreadable at a 236px thumbnail; or the gate's own fixtures
//    (a re-coloured near-duplicate, "Finalize & Hand Off", an overlong headline) pass;
// 10. paper format (6 Nov 2026 review): a new pin shows the product box, carries a sales word
//    or price, a "| Kit name" / "Save this:" / non-search title, a kit link without a template,
//    a colour other than its board's one accent, or a photo without a free licence, credit,
//    1000px width and no watermark; or more than 2 pins of one page in any 7 days;
// 11. approval hold: a held pin is in any feed, lacks its image, or releasing the hold would
//    break any rule above (every schedule, refill and quality check runs on the released plan);
// 12. a guide page a pin links to is not og:type article; the weekly visit count would skip
//    days (measure_window.mjs windowStart).
import fs from "node:fs";
import path from "node:path";
import { SITE, loadPinfeed, loadQueue, chicagoDate, addDays, dueEntries, renderFeedAt, renderBoardFeedAt, pinBoards, unreleasedCount, needsRefill, variantLink } from "../../src/lib/pinfeed.mjs";
import { decidePace, applyFallback, applyPause } from "../pinterest/pace.mjs";
import { LAYOUTS, PALETTES, ANGLES } from "../pinterest/variants.mjs";
import { appendBatch, pinPages, releaseHeld, isHeld } from "../pinterest/refill_queue.mjs";
import { dHash, distance, headlineIssue, thumbnailIssue, gateQueue, auditQueue, MIN_DISTANCE, pinIssue, photoIssue } from "../pinterest/quality.mjs";
import { SPREAD_MAX, SPREAD_DAYS, scheduleVariants } from "../../src/lib/pinfeed-core.mjs";
import { windowStart } from "../pinterest/measure_window.mjs";
import sharp from "sharp";
import os from "node:os";
import { renderVariant } from "../build_pin_images.mjs";

const errors = [];
const fail = (m) => errors.push(m);
const dist = path.resolve(process.env.PAGES_OUT_DIR || "dist");
const feed = loadPinfeed();
const rawQueue = loadQueue();
let queue = rawQueue;
const cfg = queue.config || {};
let items = queue.items || [];
const held = rawQueue.held || [];
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const PRICE = /\$\s?\d|\b\d+(\.\d\d)?\s?(usd|dollars)\b/i;

// 1. Schema.
if (!Number.isInteger(cfg.PINS_PER_DAY) || cfg.PINS_PER_DAY < 1) fail(`config.PINS_PER_DAY must be an integer >= 1 (got ${cfg.PINS_PER_DAY})`);
if (!YMD.test(cfg.FIRST_RELEASE_DATE || "")) fail("config.FIRST_RELEASE_DATE must be YYYY-MM-DD");
if (cfg.TIMEZONE !== "America/Chicago") fail("config.TIMEZONE must be America/Chicago");
if (!Number.isInteger(cfg.MAX_FEED_ITEMS) || cfg.MAX_FEED_ITEMS < 1 || cfg.MAX_FEED_ITEMS > 50) fail("config.MAX_FEED_ITEMS must be an integer 1..50");
if (!Number.isInteger(cfg.REFILL_THRESHOLD) || cfg.REFILL_THRESHOLD < 1) fail("config.REFILL_THRESHOLD must be an integer >= 1");
if (items.length === 0) fail("queue has no items");
const ids = new Set();
for (const v of items) {
  const label = v.id || JSON.stringify(v).slice(0, 60);
  if (!v.id || !v.slug || v.id !== `${v.slug}-v${v.id.split("-v").pop()}` || !/^\d+$/.test(v.id.split("-v").pop())) fail(`${label}: id must be <slug>-v<n>`);
  if (ids.has(v.id)) fail(`${label}: duplicate id`); ids.add(v.id);
  if (!/^\/(questions\/)?[a-z0-9-]+\/$/.test(v.path || "")) fail(`${label}: path must look like /page-slug/ or /questions/slug/`);
  if (!["kit", "guide", "question"].includes(v.kind)) fail(`${label}: kind must be kit, guide or question`);
  if (!v.imageSku) fail(`${label}: no imageSku`);
  if (!ANGLES.includes(v.angle)) fail(`${label}: unknown angle ${v.angle}`);
  if (!LAYOUTS.includes(v.layout)) fail(`${label}: unknown layout ${v.layout}`);
  if (!PALETTES.includes(v.palette)) fail(`${label}: unknown palette ${v.palette}`);
  for (const k of ["headline", "subhead", "title", "description"]) if (!String(v[k] || "").trim()) fail(`${label}: empty ${k}`);
  if ((v.title || "").length > 100) fail(`${label}: title ${v.title.length} chars > 100`);
  if ((v.description || "").length > 500) fail(`${label}: description ${v.description.length} chars > 500`);
  for (const k of ["headline", "subhead", "title", "description"]) if (PRICE.test(v[k] || "")) fail(`${label}: ${k} carries a price - prices drift, keep them out of pins`);
  if (!YMD.test(v.releaseDate || "")) fail(`${label}: releaseDate must be YYYY-MM-DD`);
  else if (v.releaseDate < cfg.FIRST_RELEASE_DATE) fail(`${label}: releaseDate ${v.releaseDate} before FIRST_RELEASE_DATE`);
}

// 11. Approval hold. Held pins: unique ids, paper format, no release date, in no feed at any clock.
for (const v of held) {
  if (ids.has(v.id)) fail(`${v.id}: duplicate id (held)`); ids.add(v.id);
  if (v.releaseDate !== null) fail(`${v.id}: a held pin must have releaseDate null`);
  if (v.format !== "paper") fail(`${v.id}: held pin is not paper format`);
  for (const k of ["headline", "title", "description"]) if (!String(v[k] || "").trim()) fail(`${v.id}: empty ${k}`);
}
if (isHeld(rawQueue) && rawQueue.items.some((v) => v.releaseDate > chicagoDate(new Date()))) fail("APPROVAL hold is on but pins are still scheduled after today; run npm run pinterest:refill");
if (held.length) {
  const bc = pinBoards(JSON.parse(fs.readFileSync("data/pinterest/boards.json", "utf8")));
  const heldGuids = new Set(held.map((v) => `approvalprep-pin-${v.id}`));
  for (const iso of [new Date().toISOString(), "2027-06-01T18:00:00Z"]) for (const b of bc.BOARDS) for (const m of renderBoardFeedAt(feed, rawQueue, bc, b, new Date(iso)).matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)) if (heldGuids.has(m[1])) fail(`held pin ${m[1]} is in the ${b.slug} feed at ${iso}`);
  // Every check below runs on the queue the release command would write.
  queue = JSON.parse(JSON.stringify(rawQueue));
  releaseHeld(queue, chicagoDate(new Date()));
  if (queue.held.length || queue.config.APPROVAL.state !== "released") fail("releaseHeld left pins held");
  items = queue.items;
  console.log(`[pinterest-drip] ${held.length} held pins: checking the released plan (${items.filter((v) => v.releaseDate > chicagoDate(new Date())).length} scheduled)`);
}

// 2. Variants per page, and each one distinct.
const bySlug = new Map();
for (const v of items) { if (!bySlug.has(v.slug)) bySlug.set(v.slug, []); bySlug.get(v.slug).push(v); }
for (const l of feed.items) if ((bySlug.get(l.slug) || []).length < 5) fail(`launch page ${l.slug} has ${(bySlug.get(l.slug) || []).length} variants, need >= 5`);
for (const [slug, vs] of bySlug) {
  const looks = new Set();
  for (const v of vs) { const k = `${v.headline}|${v.layout}|${v.palette}`; if (looks.has(k)) fail(`${slug}: two variants share headline + layout + palette (${k})`); looks.add(k); }
  // A batch of six never repeats its words: the image headline (product-box pins) or the
  // indexed title (paper pins, whose headline is the searched phrase itself).
  for (const [lo, hi] of [[1, 6], [7, 12], [13, 18]]) {
    const batch = vs.filter((v) => { const n = Number(v.id.split("-v").pop()); return n >= lo && n <= hi; });
    const keys = batch.map((v) => (v.format === "paper" ? `t:${v.title}` : `h:${v.headline}`));
    if (lo === 1 || batch.every((v) => v.format === "paper")) if (new Set(keys).size !== keys.length) fail(`${slug}: batch ${lo}-${hi} repeats a ${batch[0]?.format === "paper" ? "title" : "headline"}`);
  }
}

// 3. Schedule: per-day cap, no gap, no page on consecutive days.
function scheduleErrors(list, perDay) {
  const out = [];
  const byDay = new Map();
  for (const v of list) { if (!byDay.has(v.releaseDate)) byDay.set(v.releaseDate, []); byDay.get(v.releaseDate).push(v.slug); }
  const days = [...byDay.keys()].sort();
  for (const [i, d] of days.entries()) {
    const s = byDay.get(d);
    if (s.length > perDay) out.push(`${d}: ${s.length} pins > PINS_PER_DAY ${perDay}`);
    if (new Set(s).size !== s.length) out.push(`${d}: the same page twice in one day`);
    if (i > 0) {
      if (addDays(days[i - 1], 1) !== d) {
        // An empty day is allowed only when every page released later was blocked that day:
        // released the day before, or already at SPREAD_MAX in the SPREAD_DAYS window.
        for (let g = addDays(days[i - 1], 1); g < d; g = addDays(g, 1)) {
          const laterSlugs = new Set(list.filter((v) => v.releaseDate > g).map((v) => v.slug));
          const free = [...laterSlugs].filter((slug) => !(byDay.get(addDays(g, -1)) || []).includes(slug) && list.filter((v) => v.slug === slug && v.releaseDate > addDays(g, -SPREAD_DAYS) && v.releaseDate < g).length < SPREAD_MAX);
          if (free.length) out.push(`schedule gap on ${g} while ${free.slice(0, 3).join(", ")} could have been released`);
        }
      } else for (const slug of s) if (byDay.get(days[i - 1]).includes(slug)) out.push(`${slug} released on consecutive days ${days[i - 1]} and ${d}`);
    }
  }
  return out;
}
// The board-split day (data/pinterest/boards.json split_from) may carry one pin per board:
// Pinterest refuses to connect a feed with no items, and each new topic board's feed is
// connected that day. Every other day keeps PINS_PER_DAY.
// The same rule applies to the live queue and to a simulated refill of it (a refill keeps every
// released pin, so the split day is still in the list).
const SPLIT_DAY = JSON.parse(fs.readFileSync("data/pinterest/boards.json", "utf8"));
function queueScheduleErrors(list, perDay) {
  const out = scheduleErrors(list, perDay).filter((e) => !e.startsWith(`${SPLIT_DAY.split_from}: `) || !e.includes("> PINS_PER_DAY"));
  if (list.filter((v) => v.releaseDate === SPLIT_DAY.split_from).length > SPLIT_DAY.boards.length) out.push(`${SPLIT_DAY.split_from}: more pins than boards on the split day`);
  return out;
}
queueScheduleErrors(items, cfg.PINS_PER_DAY).forEach(fail);
// 10. Spread: at most SPREAD_MAX pins of one page in any SPREAD_DAYS days, for every pin
// scheduled from the rule's first day (released pins before it are history, not re-dated).
const SPREAD_FROM = "2026-11-07";
function spreadErrors(list) {
  const out = [];
  for (const v of list) {
    if (v.releaseDate < SPREAD_FROM) continue;
    const n = list.filter((x) => x.slug === v.slug && x.releaseDate > addDays(v.releaseDate, -SPREAD_DAYS) && x.releaseDate <= v.releaseDate).length;
    if (n > SPREAD_MAX) out.push(`${v.slug}: ${n} pins in the ${SPREAD_DAYS} days to ${v.releaseDate} (max ${SPREAD_MAX})`);
  }
  return [...new Set(out)];
}
spreadErrors(items).forEach(fail);
{
  // The scheduler keeps the rule even when one page has most of the pins left.
  const fx = [...Array.from({ length: 8 }, (_, i) => ({ id: `fxa-v${i + 1}`, slug: "fxa" })), ...Array.from({ length: 3 }, (_, i) => ({ id: `fxb-v${i + 1}`, slug: "fxb" }))];
  const sch = scheduleVariants(fx, { startDate: "2031-01-01", perDay: 3 });
  if (sch.length !== fx.length) fail(`spread fixture: scheduler placed ${sch.length} of ${fx.length}`);
  if (spreadErrors(sch).length) fail(`spread fixture: ${spreadErrors(sch)[0]}`);
  if (queueScheduleErrors(sch, 3).length) fail(`spread fixture: ${queueScheduleErrors(sch, 3)[0]}`);
  const crowded = [{ slug: "fxa", releaseDate: "2031-01-01" }, { slug: "fxa", releaseDate: "2031-01-03" }, { slug: "fxa", releaseDate: "2031-01-05" }];
  if (!spreadErrors(crowded).length) fail("spread fixture: three pins of one page in 5 days passed");
}

// 4 + 5. Links and images against the build.
const pageExists = (p) => fs.existsSync(path.join(dist, p, "index.html"));
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
if (!fs.existsSync(path.join(dist, "index.html"))) fail(`${dist}/index.html missing - build did not run`);
else for (const v of items) {
  const u = new URL(variantLink(feed, v));
  if (u.origin !== SITE) fail(`${v.id}: link off-site ${u.href}`);
  const q = u.searchParams;
  if (q.get("utm_source") !== "pinterest" || q.get("utm_medium") !== "organic" || q.get("utm_campaign") !== "pinfeed" || q.get("utm_content") !== v.id) fail(`${v.id}: link utm params wrong: ${u.search}`);
  if (!pageExists(u.pathname)) fail(`${v.id}: ${u.pathname} not in built output`);
  const img = path.join(dist, "pins", `${v.id}.png`);
  if (!fs.existsSync(img)) { fail(`${v.id}: dist/pins/${v.id}.png missing`); continue; }
  const s = pngSize(img);
  if (!s || s.w !== 1000 || s.h !== 1500) fail(`${v.id}: image is ${s ? `${s.w}x${s.h}` : "not a PNG"}, need 1000x1500`);
}

// 6. Feed at fixed clocks.
const guids = (xml) => [...xml.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map((m) => m[1]);
const launchGuids = feed.items.map((i) => `approvalprep-pin-${i.slug}`);
const first = [...items].sort((a, b) => (a.releaseDate < b.releaseDate ? -1 : 1))[0];
function expectFeed(isoNow, label) {
  const now = new Date(isoNow);
  const day = chicagoDate(now);
  const due = items.filter((v) => v.releaseDate <= day);
  const want = [...due.map((v) => `approvalprep-pin-${v.id}`), ...launchGuids];
  const got = guids(renderFeedAt(feed, queue, now));
  if (got.length !== Math.min(want.length, cfg.MAX_FEED_ITEMS)) fail(`feed at ${isoNow} (${label}): ${got.length} items, want ${Math.min(want.length, cfg.MAX_FEED_ITEMS)}`);
  for (const g of got) if (!want.includes(g)) fail(`feed at ${isoNow} (${label}): shows ${g}, not due`);
  if (want.length <= cfg.MAX_FEED_ITEMS) for (const g of want) if (!got.includes(g)) fail(`feed at ${isoNow} (${label}): missing due item ${g}`);
  return got;
}
const launchDay = expectFeed("2026-10-16T17:00:00Z", "launch day noon CT");
if (launchDay.length !== feed.items.length || launchDay.some((g) => !launchGuids.includes(g))) fail(`launch day feed must be exactly the ${feed.items.length} launch items, got ${launchDay.length}`);
if (first) {
  // 23:59 CT the evening before the first release, then 00:00 CT on the day.
  const midnightCT = (ymd) => { for (let h = 3; h <= 7; h++) { const t = new Date(`${ymd}T0${h}:00:00Z`); if (chicagoDate(t) === ymd) return t; } return null; };
  const m = midnightCT(first.releaseDate);
  const before = expectFeed(new Date(m.getTime() - 60000).toISOString(), "one minute before the first release");
  const after = expectFeed(m.toISOString(), "first release, 00:00 CT");
  if (before.includes(`approvalprep-pin-${first.id}`)) fail(`${first.id} visible before its release day`);
  if (after[0] !== `approvalprep-pin-${first.id}`) fail(`${first.id} is not the newest item on its release day (got ${after[0]})`);
}
expectFeed("2026-11-20T18:00:00Z", "mid-run");
const lastDay = items.map((v) => v.releaseDate).sort().at(-1);
if (lastDay) {
  const end = expectFeed(`${addDays(lastDay, 5)}T18:00:00Z`, "after the last release");
  if (items.length + feed.items.length > cfg.MAX_FEED_ITEMS && end.length !== cfg.MAX_FEED_ITEMS) fail(`feed must cap at ${cfg.MAX_FEED_ITEMS}, got ${end.length}`);
}
const entry = dueEntries(feed, queue, new Date("2026-11-20T18:00:00Z")).find((e) => e.guid !== launchGuids[0] && !launchGuids.includes(e.guid));
if (entry && !entry.link.includes("utm_content=")) fail("a drip entry's link lacks utm_content");

// 6b. Topic boards (1 Nov 2026): what Pinterest is served is one feed per board. At
// each clock every due pin is in exactly one board feed, and no topic-board feed
// carries a pin released before the split (those were all published to the first board).
const boards = pinBoards(JSON.parse(fs.readFileSync("data/pinterest/boards.json", "utf8")));
for (const iso of ["2026-11-01T18:00:00Z", "2026-11-20T18:00:00Z"]) {
  const now = new Date(iso);
  const seen = new Map();
  for (const b of boards.BOARDS) {
    const got = guids(renderBoardFeedAt(feed, queue, boards, b, now));
    if (got.length > cfg.MAX_FEED_ITEMS) fail(`${b.slug} feed at ${iso}: ${got.length} items > ${cfg.MAX_FEED_ITEMS}`);
    for (const g of got) {
      if (seen.has(g)) fail(`${g} is in two board feeds (${seen.get(g)}, ${b.slug}) at ${iso}`);
      seen.set(g, b.slug);
      const v = items.find((x) => `approvalprep-pin-${x.id}` === g);
      if (b !== boards.MAIN_BOARD && (!v || v.releaseDate < boards.SPLIT_FROM || boards.boardFor(v.path, v.headline).slug !== b.slug)) fail(`${b.slug} feed at ${iso} carries ${g}, which is not its own post-split pin`);
    }
  }
  const due = items.filter((v) => v.releaseDate <= chicagoDate(now));
  if (due.length + feed.items.length <= cfg.MAX_FEED_ITEMS) for (const v of due) if (!seen.has(`approvalprep-pin-${v.id}`)) fail(`${v.id} is due at ${iso} but in no board feed`);
}
for (const b of boards.BOARDS.slice(1)) if (!boards.BOARDS.some((x) => x === b && b.feed.startsWith("/pinfeed/") && b.feed.endsWith(".xml"))) fail(`${b.slug}: feed must be /pinfeed/<board>.xml`);
if (boards.boardFor("/questions/x/", "how to write a letter of explanation for a mortgage").slug !== "letter-of-explanation") fail("a letter-of-explanation question did not reach its board");
// Pinterest refuses to connect a feed with no items, so every topic board has a pin on the split day.
for (const b of boards.BOARDS.slice(1)) if (!guids(renderBoardFeedAt(feed, queue, boards, b, new Date(`${boards.SPLIT_FROM}T18:00:00Z`))).length) fail(`${b.slug}: its feed is empty on ${boards.SPLIT_FROM}, so Pinterest cannot connect it`);

// 6c. Stop rule (Growth playbook): 0 visits at 4 weeks -> new format; 8 -> pause, never delete.
{
  const wk = (d, v) => ({ weekEnding: d, pinterestViews: v });
  const zeros = ["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"].map((d) => wk(d, 0));
  const q = JSON.parse(JSON.stringify(queue));
  if (decidePace(q.config, { state: "MEASURED", weeks: zeros }, "2026-11-28").action !== "keep") fail("stop rule acted before 4 weeks");
  if (decidePace(q.config, { state: "MEASURED", weeks: [...zeros.slice(0, 3), wk("2026-11-28", 1)] }, "2026-11-30").action !== "keep") fail("stop rule acted despite a visit");
  if (decidePace(q.config, { state: "NAMED_STOP", weeks: zeros }, "2026-11-30").action !== "keep") fail("a named stop was read as zero visits");
  const d1 = decidePace(q.config, { state: "MEASURED", weeks: zeros }, "2026-11-29");
  if (d1.action !== "fallback") fail(`4 zero weeks gave ${d1.action}, want fallback`);
  else {
    applyFallback(q, "2026-11-29", d1.reason);
    const more = ["2026-12-05", "2026-12-12", "2026-12-19", "2026-12-26"].map((d) => wk(d, 0));
    const d2 = decidePace(q.config, { state: "MEASURED", weeks: [...zeros, ...more] }, "2026-12-27");
    if (d2.action !== "pause") fail(`8 zero weeks gave ${d2.action}, want pause`);
    const before = q.items.filter((v) => v.releaseDate <= "2026-12-27").length;
    applyPause(q, "2026-12-27", d2.reason);
    if (q.items.length !== before || q.items.some((v) => v.releaseDate > "2026-12-27")) fail("pause must keep every released pin and drop only future dates");
  }
}

// 7. Refill rule.
const clone = () => JSON.parse(JSON.stringify(queue));
const sortedDays = [...new Set(items.map((v) => v.releaseDate))].sort();
const T = cfg.REFILL_THRESHOLD;
if (sortedDays.length > T + 1) {
  // A clock at which exactly T unreleased remain, and one at which T-1 remain.
  // The latest day after which at least T pins remain (the last day may be short when the
  // quality gate held a pin, so count rather than assume PINS_PER_DAY on every day).
  const after = (d) => items.filter((v) => v.releaseDate > d).length;
  const dayWithTLeft = [...sortedDays].reverse().find((d) => after(d) >= T);
  const atT = new Date(`${dayWithTLeft}T18:00:00Z`);
  const atTminus = new Date(`${addDays(dayWithTLeft, 1)}T18:00:00Z`);
  if (unreleasedCount(queue, atT) < T) fail(`refill fixture: expected >= ${T} unreleased at ${dayWithTLeft}`);
  if (needsRefill(queue, atT)) fail(`needsRefill true with ${unreleasedCount(queue, atT)} unreleased (threshold ${T})`);
  if (!needsRefill(queue, atTminus)) fail(`needsRefill false with ${unreleasedCount(queue, atTminus)} unreleased (threshold ${T})`);
  const q2 = clone();
  const pages = pinPages();
  const added = appendBatch(q2, pages, atTminus);
  const coveredPages = new Set(added.map((v) => v.slug));
  for (const p of pages) if (!coveredPages.has(p.slug)) fail(`refill batch skipped page ${p.slug}`);
  if (added.length && added[0].releaseDate !== addDays(lastDay, 1)) fail(`refill batch starts ${added[0]?.releaseDate}, want the day after the last queued release ${addDays(lastDay, 1)}`);
  const allIds = new Set(); for (const v of q2.items) { if (allIds.has(v.id)) fail(`refill batch reused id ${v.id}`); allIds.add(v.id); }
  queueScheduleErrors(q2.items, cfg.PINS_PER_DAY).forEach((e) => fail(`after a refill: ${e}`));
  // The split-day allowance is one pin per board, never more, and only on that day.
  const overSplit = clone(); const sd = overSplit.items.filter((v) => v.releaseDate === SPLIT_DAY.split_from);
  if (sd.length) { for (let i = sd.length; i <= SPLIT_DAY.boards.length; i++) overSplit.items.push({ ...sd[0], id: `${sd[0].slug}-v9${i}`, slug: `x-split-${i}` }); }
  if (sd.length && !queueScheduleErrors(overSplit.items, cfg.PINS_PER_DAY).some((e) => e.includes("more pins than boards"))) fail("schedule rule: a split day with more pins than boards was not caught");
  const overDay = clone(); const d0 = overDay.items.find((v) => v.releaseDate !== SPLIT_DAY.split_from);
  for (let i = 0; i < cfg.PINS_PER_DAY; i++) overDay.items.push({ ...d0, id: `${d0.slug}-v8${i}`, slug: `x-day-${i}` });
  if (!queueScheduleErrors(overDay.items, cfg.PINS_PER_DAY).some((e) => e.startsWith(`${d0.releaseDate}: `) && e.includes("> PINS_PER_DAY"))) fail(`schedule rule: ${d0.releaseDate} over PINS_PER_DAY was not caught`);
  for (const v of added) for (const k of ["title", "description"]) if (PRICE.test(v[k]) || v[k].length > (k === "title" ? 100 : 500)) fail(`refill ${v.id}: ${k} breaks the copy rules`);
}
const liveLeft = unreleasedCount(queue, new Date());
if (liveLeft < 7) fail(`only ${liveLeft} unreleased pins left - the daily refill (pinterest-refill.yml) has not run for a week; run npm run pinterest:refill`);

// 8. Request-time function wiring.
const fn = fs.existsSync("functions/pinfeed.xml.js") ? fs.readFileSync("functions/pinfeed.xml.js", "utf8") : "";
if (!fn) fail("functions/pinfeed.xml.js missing - the feed would only change on a deploy");
else for (const needle of ["data/pinterest/pinfeed.json", "data/pinterest/queue.json", "renderBoardFeedAt", "onRequestGet"]) if (!fn.includes(needle)) fail(`functions/pinfeed.xml.js lacks ${needle}`);
if (!fs.existsSync("functions/pinfeed/[board].js")) fail("functions/pinfeed/[board].js missing - the topic boards would have no feed");
if (fs.existsSync(path.join(dist, "_routes.json"))) {
  const r = JSON.parse(fs.readFileSync(path.join(dist, "_routes.json"), "utf8"));
  if ((r.exclude || []).some((x) => x === "/pinfeed.xml" || x === "/*")) fail("dist/_routes.json excludes /pinfeed.xml from Functions");
}

// 9. Pin quality gate: fixtures first (the gate must catch each failure), then every unreleased built pin.
{
  const pagesBySlug = new Map(pinPages().map((p) => [p.slug, p]));
  const pageFor = (v) => pagesBySlug.get(v.slug) || null;
  const base = items.find((v) => v.kind === "kit" && pageFor(v));
  if (!base) fail("quality fixture: no kit pin to test the gate with");
  else {
    const h0 = await dHash(await renderVariant(base));
    const recoloured = { ...base, palette: PALETTES.find((p) => p !== base.palette) };
    const relaid = { ...base, layout: LAYOUTS.find((l) => l !== base.layout) };
    if (distance(h0, await dHash(await renderVariant(base))) !== 0) fail("quality fixture: the same pin must hash identically");
    const dRe = distance(h0, await dHash(await renderVariant(recoloured)));
    if (dRe >= MIN_DISTANCE) fail(`quality fixture: a re-coloured copy of ${base.id} is ${dRe} bits away, the gate (>= ${MIN_DISTANCE}) would let a near-duplicate through`);
    const dLay = distance(h0, await dHash(await renderVariant(relaid)));
    if (dLay < MIN_DISTANCE) fail(`quality fixture: a different layout of ${base.id} is only ${dLay} bits away, the gate would refuse every real variant`);
    if (!headlineIssue({ ...base, headline: "Finalize & Hand Off" }, pageFor(base))) fail('quality fixture: vague headline "Finalize & Hand Off" passed');
    if (headlineIssue(base, pageFor(base))) fail(`quality fixture: ${base.id} real headline refused: ${headlineIssue(base, pageFor(base))}`);
    if (!thumbnailIssue({ ...base, layout: "checklist", headline: "How to write a letter of explanation, explained in plain language" })) fail("quality fixture: a headline cut off at 3 lines passed");
    // The gate reworks a near-duplicate and holds a pin it cannot fix.
    const q = { config: cfg, items: [{ ...base, id: "fx-a-v1", releaseDate: "2030-01-01" }, { ...recoloured, id: "fx-a-v2", releaseDate: "2030-01-02" }, { ...base, id: "fx-q-v1", slug: "fx-q", kind: "question", headline: "Finalize & Hand Off", releaseDate: "2030-01-03" }] };
    const r = await gateQueue(q, "2030-01-01", { pageFor });
    const v2 = q.items.find((v) => v.id === "fx-a-v2");
    if (!v2 || !r.reworked.some((w) => w.id === "fx-a-v2")) fail("quality fixture: the gate did not rework a near-duplicate pin");
    else if (distance(h0, await dHash(await renderVariant(v2))) < MIN_DISTANCE) fail("quality fixture: the reworked pin is still a near-duplicate");
    if (!r.held.some((h) => h.id === "fx-q-v1") || q.items.some((v) => v.id === "fx-q-v1")) fail("quality fixture: an unfixable vague pin was kept instead of held");
  }
  // A missing image is already its own failure (section 5); hash a fresh render instead of crashing.
  const builtPin = async (v) => { const f = path.join(dist, "pins", `${v.id}.png`); return fs.existsSync(f) ? fs.readFileSync(f) : renderVariant(v); };
  const unreleased = items.filter((v) => v.releaseDate > chicagoDate(new Date()));
  if (!unreleased.length) fail("quality gate: zero unreleased pins to check");
  else if (fs.existsSync(path.join(dist, "pins"))) {
    const bad = await auditQueue(queue, chicagoDate(new Date()), { pageFor, render: builtPin });
    bad.forEach((b) => fail(`quality gate: ${b} - run npm run pinterest:refill (it reworks or holds such pins)`));
  }
}

// 10. Paper-format gate fixtures: each refusal must fire, and a real paper pin must pass.
{
  const pagesBySlug = new Map(pinPages().map((p) => [p.slug, p]));
  const pageFor = (v) => pagesBySlug.get(v.slug) || null;
  const paper = items.filter((v) => v.format === "paper" && pageFor(v));
  const kitPin = paper.find((v) => v.kind === "kit");
  if (!kitPin) fail("paper fixture: no paper kit pin to test the gate with");
  else {
    const page = pageFor(kitPin);
    const must = async (label, v) => { if (!(await pinIssue(v, page))) fail(`paper fixture: ${label} passed the gate`); };
    if (await pinIssue(kitPin, page)) fail(`paper fixture: real pin ${kitPin.id} refused: ${await pinIssue(kitPin, page)}`);
    await must("the product box layout", { ...kitPin, layout: "band-top" });
    await must('"instant download" on the image', { ...kitPin, headline: `${kitPin.headline} instant download` });
    await must("a price in the description", { ...kitPin, description: `${kitPin.description} Only $19.` });
    await must('"kit" in the title', { ...kitPin, title: `${kitPin.title} kit` });
    await must('a "| Kit name" title', { ...kitPin, title: `${kitPin.title} | Credit Letter Kit` });
    await must('a "Save this:" title', { ...kitPin, title: `Save this: ${kitPin.title}` });
    await must("a question-only title", { ...kitPin, title: "Viewing this weekend? Have your packet ready" });
    await must("a kit pin naming no template", { ...kitPin, title: allowedTitleWithout(kitPin.title) });
    await must("another board's accent", { ...kitPin, palette: kitPin.palette === "orange" ? "green" : "orange" });
    await must("4 checklist lines", { ...kitPin, layout: "paper-list", items: ["One", "Two", "Three", "Four"], letter: undefined });
  }
  function allowedTitleWithout(t) { return t.replace(/\btemplates?\b/gi, "letter").replace(/\s+/g, " "); }
  // Photos: free licence, credited, >= 1000px, no watermark.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ap-photo-"));
  await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#ccbbaa" } }).jpeg().toFile(path.join(dir, "ok.jpg"));
  await sharp({ create: { width: 800, height: 900, channels: 3, background: "#ccbbaa" } }).jpeg().toFile(path.join(dir, "small.jpg"));
  const good = { file: "ok.jpg", licence: "unsplash", source_url: "https://unsplash.com/photos/abc", photographer: "A Person", photographer_url: "https://unsplash.com/@a", watermark: false };
  const pv = { layout: "photo-band", photo: "ok.jpg" };
  if (await photoIssue(pv, { photos: [good] }, dir)) fail(`photo fixture: a good photo refused: ${await photoIssue(pv, { photos: [good] }, dir)}`);
  for (const [label, entry, file] of [["Unsplash+", { ...good, source_url: "https://plus.unsplash.com/premium_photo-1" }], ["an unknown licence", { ...good, licence: "shutterstock" }], ["no photographer", { ...good, photographer: "" }], ["an unchecked watermark", { ...good, watermark: null }], ["an 800px photo", { ...good, file: "small.jpg" }, "small.jpg"]])
    if (!(await photoIssue({ ...pv, photo: file || "ok.jpg" }, { photos: [entry] }, dir))) fail(`photo fixture: ${label} passed`);
  fs.rmSync(dir, { recursive: true, force: true });
  for (const p of JSON.parse(fs.readFileSync("data/pinterest/photos.json", "utf8")).photos || []) { const i = await photoIssue({ layout: "photo-band", photo: p.file }); if (i) fail(`data/pinterest/photos.json: ${i}`); }
}

// 12a. Guide pages a pin links to are articles to Pinterest.
{
  const guidePaths = [...new Set([...items, ...held].filter((v) => v.kind === "guide" || v.kind === "question").map((v) => v.path))];
  if (!guidePaths.length) fail("og fixture: no guide pins to check");
  for (const gp of guidePaths) {
    const f = path.join(dist, gp, "index.html");
    if (!fs.existsSync(f)) continue;
    const og = fs.readFileSync(f, "utf8").match(/<meta[^>]*property="og:type"[^>]*>/i)?.[0] || "";
    if (!/content="article"/.test(og)) fail(`${gp}: og:type is not article, so its pins show less detail`);
  }
}
// 12b. The weekly visit count covers every day since the last count.
{
  const now = new Date("2026-11-07T12:00:00Z");
  const lastMonday = { weeks: [{ weekEnding: "2026-10-26", since: "2026-10-19T11:00:00.000Z" }] };
  if (windowStart(lastMonday, now) !== "2026-10-26T11:00:00.000Z") fail(`measure window: after a Monday count the Saturday count starts ${windowStart(lastMonday, now)}, want 2026-10-26T11:00:00.000Z (27-30 Oct must be counted)`);
  if (windowStart({ weeks: [{ since: "2026-10-31T11:00:00.000Z", until: "2026-11-07T11:00:00.000Z" }] }, new Date("2026-11-14T11:00:00Z")) !== "2026-11-07T11:00:00.000Z") fail("measure window: does not start where the last count ended");
  if (windowStart({ weeks: [] }, now) !== new Date(now.getTime() - 7 * 86400000).toISOString()) fail("measure window: first count is not 7 days");
}

if (errors.length) { console.error(`[pinterest-drip] FAIL\n- ${errors.slice(0, 40).join("\n- ")}${errors.length > 40 ? `\n- ... ${errors.length - 40} more` : ""}`); process.exit(1); }
const pages = new Set(items.map((v) => v.slug)).size;
console.log(`[pinterest-drip] OK ${items.length} variants for ${pages} pages, ${cfg.PINS_PER_DAY}/day ${items[0]?.releaseDate}..${lastDay}, ${liveLeft} unreleased; no page on consecutive days; every image 1000x1500; feed exact at fixed clocks; refill flips at ${T}; every unreleased pin passes the quality gate`);
