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
import fs from "node:fs";
import path from "node:path";
import { loadPinfeed, loadQueue, QUEUE_FILE, chicagoDate, addDays, scheduleVariants, unreleasedCount, needsRefill, previewImagePath } from "../../src/lib/pinfeed.mjs";
import { paidSkusFrom } from "../../src/lib/skuForRoute.mjs";
import { buildVariant, VARIANTS_PER_PAGE_PER_BATCH } from "./variants.mjs";

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
    for (let n = next; n < next + VARIANTS_PER_PAGE_PER_BATCH; n++) fresh.push(buildVariant(page, n, pageIndex));
  });
  const scheduled = scheduleVariants(fresh, { startDate, perDay, prevDaySlugs });
  items.push(...scheduled);
  return scheduled;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Set(process.argv.slice(2));
  const queue = loadQueue(root);
  const now = process.env.PINFEED_NOW ? new Date(process.env.PINFEED_NOW) : new Date();
  const left = unreleasedCount(queue, now);
  const due = needsRefill(queue, now);
  if (args.has("--check")) {
    console.log(`[pinterest-refill] ${left} unreleased, threshold ${queue.config.REFILL_THRESHOLD}: ${due ? "REFILL DUE" : "stocked"}`);
    process.exit(0);
  }
  if (!due && !args.has("--force")) {
    console.log(`[pinterest-refill] stocked: ${left} unreleased >= ${queue.config.REFILL_THRESHOLD}; nothing written`);
    process.exit(0);
  }
  // --seed: the launch pages only (the first batch, 16 Oct 2026).
  const pages = args.has("--seed") ? pinPages().filter((p) => loadPinfeed(root).items.some((i) => i.slug === p.slug)) : pinPages();
  if (!pages.length) { console.error("[pinterest-refill] FAIL no pages to pin"); process.exit(1); }
  const added = appendBatch(queue, pages, now);
  if (!added.length) { console.error("[pinterest-refill] FAIL refill due but no variants generated"); process.exit(1); }
  fs.writeFileSync(path.join(root, QUEUE_FILE), JSON.stringify(queue, null, 2) + "\n");
  console.log(`[pinterest-refill] OK appended ${added.length} variants for ${pages.length} pages, ${added[0].releaseDate} to ${added.at(-1).releaseDate}; ${unreleasedCount(queue, now)} unreleased`);
}
