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
// 8. the request-time Pages Function is not wired to both data files.
import fs from "node:fs";
import path from "node:path";
import { SITE, loadPinfeed, loadQueue, chicagoDate, addDays, dueEntries, renderFeedAt, unreleasedCount, needsRefill, variantLink } from "../../src/lib/pinfeed.mjs";
import { LAYOUTS, PALETTES, ANGLES } from "../pinterest/variants.mjs";
import { appendBatch, pinPages } from "../pinterest/refill_queue.mjs";

const errors = [];
const fail = (m) => errors.push(m);
const dist = path.resolve(process.env.PAGES_OUT_DIR || "dist");
const feed = loadPinfeed();
const queue = loadQueue();
const cfg = queue.config || {};
const items = queue.items || [];
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
  if (!/^\/[a-z0-9-]+\/$/.test(v.path || "")) fail(`${label}: path must look like /page-slug/`);
  if (!["kit", "guide"].includes(v.kind)) fail(`${label}: kind must be kit or guide`);
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

// 2. Variants per page, and each one distinct.
const bySlug = new Map();
for (const v of items) { if (!bySlug.has(v.slug)) bySlug.set(v.slug, []); bySlug.get(v.slug).push(v); }
for (const l of feed.items) if ((bySlug.get(l.slug) || []).length < 5) fail(`launch page ${l.slug} has ${(bySlug.get(l.slug) || []).length} variants, need >= 5`);
for (const [slug, vs] of bySlug) {
  const looks = new Set();
  for (const v of vs) { const k = `${v.headline}|${v.layout}|${v.palette}`; if (looks.has(k)) fail(`${slug}: two variants share headline + layout + palette (${k})`); looks.add(k); }
  const firstSix = vs.filter((v) => Number(v.id.split("-v").pop()) <= 6).map((v) => v.headline);
  if (new Set(firstSix).size !== firstSix.length) fail(`${slug}: the first batch repeats a headline`);
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
      if (addDays(days[i - 1], 1) !== d) out.push(`schedule gap between ${days[i - 1]} and ${d}`);
      else for (const slug of s) if (byDay.get(days[i - 1]).includes(slug)) out.push(`${slug} released on consecutive days ${days[i - 1]} and ${d}`);
    }
  }
  return out;
}
scheduleErrors(items, cfg.PINS_PER_DAY).forEach(fail);

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

// 7. Refill rule.
const clone = () => JSON.parse(JSON.stringify(queue));
const sortedDays = [...new Set(items.map((v) => v.releaseDate))].sort();
const T = cfg.REFILL_THRESHOLD;
if (sortedDays.length > T + 1) {
  // A clock at which exactly T unreleased remain, and one at which T-1 remain.
  const perDay = cfg.PINS_PER_DAY;
  const dayWithTLeft = sortedDays[sortedDays.length - 1 - Math.ceil(T / perDay)];
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
  scheduleErrors(q2.items, cfg.PINS_PER_DAY).forEach((e) => fail(`after a refill: ${e}`));
  for (const v of added) for (const k of ["title", "description"]) if (PRICE.test(v[k]) || v[k].length > (k === "title" ? 100 : 500)) fail(`refill ${v.id}: ${k} breaks the copy rules`);
}
const liveLeft = unreleasedCount(queue, new Date());
if (liveLeft < 7) fail(`only ${liveLeft} unreleased pins left - the daily refill (pinterest-refill.yml) has not run for a week; run npm run pinterest:refill`);

// 8. Request-time function wiring.
const fn = fs.existsSync("functions/pinfeed.xml.js") ? fs.readFileSync("functions/pinfeed.xml.js", "utf8") : "";
if (!fn) fail("functions/pinfeed.xml.js missing - the feed would only change on a deploy");
else for (const needle of ["data/pinterest/pinfeed.json", "data/pinterest/queue.json", "renderFeedAt", "onRequestGet"]) if (!fn.includes(needle)) fail(`functions/pinfeed.xml.js lacks ${needle}`);
if (fs.existsSync(path.join(dist, "_routes.json"))) {
  const r = JSON.parse(fs.readFileSync(path.join(dist, "_routes.json"), "utf8"));
  if ((r.exclude || []).some((x) => x === "/pinfeed.xml" || x === "/*")) fail("dist/_routes.json excludes /pinfeed.xml from Functions");
}

if (errors.length) { console.error(`[pinterest-drip] FAIL\n- ${errors.slice(0, 40).join("\n- ")}${errors.length > 40 ? `\n- ... ${errors.length - 40} more` : ""}`); process.exit(1); }
const pages = new Set(items.map((v) => v.slug)).size;
console.log(`[pinterest-drip] OK ${items.length} variants for ${pages} pages, ${cfg.PINS_PER_DAY}/day ${items[0]?.releaseDate}..${lastDay}, ${liveLeft} unreleased; no page on consecutive days; every image 1000x1500; feed exact at fixed clocks; refill flips at ${T}`);
