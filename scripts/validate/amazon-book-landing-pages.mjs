#!/usr/bin/env node
/**
 * Book companion page guard.
 *
 * Seven finished Kindle books each carry one of these URLs printed inside the
 * EPUB. The link is baked into files already uploaded to Amazon, so it cannot
 * be corrected after publication: if one of these paths stops building, every
 * reader who reaches the end of that book lands on a 404 permanently, and the
 * only remedy is re-uploading the book.
 *
 * That is why this is a HARD_FAIL rather than a content check. The seven paths
 * below are transcribed from the shipped books and must never be edited to
 * match the code - if they disagree, the code is wrong.
 *
 * What it asserts, and why each one:
 *
 *   1. All eight paths (the seven books plus the /amazon parent, which used to
 *      404 on its own) exist in the built output as `<path>/index.html`, and
 *      every one really answers 200 over HTTP. The file check alone would pass
 *      on a zero-byte file; the server check is what makes "returns 200" a
 *      measurement rather than an assumption.
 *
 *   2. Each page reaches a real purchase path: a checkout button whose data-sku
 *      resolves to a product in data/products/products.json that is
 *      `stripe_enabled` and carries a `stripe_price_env`. A button wired to a
 *      SKU Stripe has never heard of is worse than no button.
 *
 *   3. Every one of the seven is wired to a live SKU, and a page whose product
 *      is only a partial match declares the gap. Two of the seven have no exact
 *      product, because neither document is one the reader fills in: the donor
 *      signs the gift letter and the landlord writes the reference. Those two
 *      point at the Complete ApprovalPrep Bundle. That routing is the owner's
 *      decision and this validator does not re-litigate it.
 *
 *      What it does enforce is the description. A page carrying `productGap`
 *      must print that text in the built HTML, so the reader sees what the
 *      product does not contain before the button rather than after the
 *      charge. A false statement about what someone is buying produces the
 *      refund and the chargeback, which cost more than the sale that honesty
 *      would have lost.
 *
 *      This rule used to be symmetric: a page with `sku: null` had to carry no
 *      button and print a `noProductReason`. No page is registered that way any
 *      more, so that branch was removed rather than left as a rule nothing
 *      exercises. The replacement is stronger, not weaker - `sku` is now
 *      mandatory on all seven, so a page cannot quietly lose its purchase path.
 *
 *   4. Each page is reachable from the /amazon index and links back to it, so
 *      none of the eight is an orphan inside the site.
 *
 *   5. The published-URL posture is what was decided, not whatever drifted.
 *      These routes are registered index:false / ADMITTED_SUPPORT_NOINDEX and
 *      are deliberately absent from the sitemap: a reader arrives by following
 *      a link printed in a book, never from a search result, and indexing seven
 *      commercial near-duplicates of the organic guides they link to would put
 *      them in competition with those guides. The assertion is two-sided - each
 *      page must carry the noindex directive AND must be absent from
 *      sitemap.xml - so flipping one without the other fails here rather than
 *      shipping a page that is in the sitemap and tells crawlers to ignore it.
 *
 *      To reverse the decision and index these pages, the whole set has to move
 *      together: route_manifest `index: true` + `indexing: "index"`, admission
 *      status ADMITTED_INDEXABLE, `noindex={false}` in the two page files, the
 *      EXPECT_INDEXED constant below flipped, five query_universe rows and a
 *      four-child fanout parent per route (scripts/validate/atlas.mjs), route
 *      copy of 480+ words per route (scripts/validate/public-page-depth.mjs) -
 *      and it must then clear the publication cap in scripts/cadence_gate.cjs,
 *      which admits two new sitemap URLs per rolling seven days.
 *
 *   6. It examined a non-zero number of pages. A guard that finds nothing and
 *      exits 0 is the failure mode this repo has already been bitten by three
 *      times (see the "Build the site the validators measure" step in
 *      .github/workflows/validate.yml), so every loop below is counted and the
 *      counts are asserted at the end.
 *
 * Proving it fails: delete any one of dist/amazon/<slug>/index.html, or change
 * a registry `sku` to a SKU that is not in products.json, or set that SKU to
 * `draft` in data/products/seed_product_registry.json so checkout would reject
 * it, or drop a `sku`, or delete a `productGap` sentence from a page that
 * carries one, or add one of these URLs to public/sitemap.xml, and this exits 1
 * naming the path.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { readJson, fail, root } from "./_common.mjs";

// Transcribed from the shipped EPUB files. Do not edit to match the code.
const SHIPPED_BOOK_PATHS = [
  "/amazon/employment-verification-letter",
  "/amazon/letter-of-explanation",
  "/amazon/proof-of-income-self-employed",
  "/amazon/credit-dispute-letter",
  "/amazon/rental-application-packet",
  "/amazon/landlord-reference-letter",
  "/amazon/gift-letter-down-payment",
];
const INDEX_PATH = "/amazon";
const ALL_PATHS = [INDEX_PATH, ...SHIPPED_BOOK_PATHS];
// The recorded decision, asserted in both directions. See note 5 above.
const EXPECT_INDEXED = false;

const errors = [];
const registry = readJson("data/content/amazon_book_landing_pages.json");
const manifest = readJson("data/routes/route_manifest.json").routes;
const admission = readJson("data/atlas/route_admission_manifest.json").routes;
const products = readJson("data/products/products.json").products;
const productBySku = new Map(products.map((product) => [product.sku, product]));
// products.json is the catalogue the pages render from. It is not what checkout
// resolves: functions/api/create-checkout-session.js looks the sku up with
// getProductBySlug, which falls back to this seed registry and rejects anything
// that is not live and public. Checking only products.json would let a button
// render for a sku that returns PRODUCT_NOT_AVAILABLE at the moment of payment.
const seedRegistry = readJson("data/products/seed_product_registry.json");
const sellableSlugs = new Map((seedRegistry.products || []).map((product) => [product.slug, product]));

/* ---------- registry covers exactly the shipped paths ---------- */

const registryPaths = registry.pages.map((page) => page.path);
for (const shipped of SHIPPED_BOOK_PATHS) {
  if (!registryPaths.includes(shipped)) errors.push(`registry is missing a shipped book URL: ${shipped}`);
}
for (const listed of registryPaths) {
  if (!SHIPPED_BOOK_PATHS.includes(listed)) errors.push(`registry lists a path no book points at: ${listed}`);
}
if (registry.indexPath !== INDEX_PATH) errors.push(`registry indexPath is ${registry.indexPath}, expected ${INDEX_PATH}`);

/* ---------- route registration ---------- */

let routesChecked = 0;
for (const routePath of ALL_PATHS) {
  const route = manifest.find((item) => item.path === routePath);
  if (!route) { errors.push(`route missing from data/routes/route_manifest.json: ${routePath}`); continue; }
  routesChecked += 1;
  if (route.type !== "public") errors.push(`route is not public: ${routePath}`);
  if (Boolean(route.index) !== EXPECT_INDEXED) errors.push(`route index flag is ${route.index}, expected ${EXPECT_INDEXED}: ${routePath}`);
  if (route.indexing !== (EXPECT_INDEXED ? "index" : "noindex")) errors.push(`route indexing is ${route.indexing}, expected ${EXPECT_INDEXED ? "index" : "noindex"}: ${routePath}`);
  if (!route.primary_cta) errors.push(`route has no primary_cta: ${routePath}`);

  const admitted = admission.find((item) => item.route === routePath);
  if (!admitted) errors.push(`route missing from data/atlas/route_admission_manifest.json: ${routePath}`);
  else if (!String(admitted.status).startsWith("ADMITTED")) errors.push(`route is not admitted: ${routePath} (${admitted.status})`);
}

/* ---------- built output ---------- */

const distDir = path.join(root, "dist");
if (!fs.existsSync(distDir)) fail("[amazon-book-landing-pages] dist/ is missing - run `npm run build` before this validator, the way .github/workflows/validate.yml does");

const html = new Map();
let filesChecked = 0;
for (const routePath of ALL_PATHS) {
  const file = path.join(distDir, routePath.replace(/^\//, ""), "index.html");
  if (!fs.existsSync(file)) { errors.push(`built page missing: dist${routePath}/index.html`); continue; }
  const body = fs.readFileSync(file, "utf8");
  if (body.length < 2000) { errors.push(`built page is suspiciously small (${body.length} bytes): ${routePath}`); continue; }
  html.set(routePath, body);
  filesChecked += 1;
}

/* ---------- purchase path ---------- */

const skuPattern = /data-sku="([^"]+)"/g;
// Rendered HTML escapes the em dashes and apostrophes the copy is written with,
// so compare against the escaped form before asserting a sentence is on the page.
const escapeHtml = (value) => value.replace(/&/g, "&#38;").replace(/</g, "&#60;").replace(/>/g, "&#62;").replace(/"/g, "&#34;");
const onPage = (body, sentence) => body.includes(sentence) || body.includes(escapeHtml(sentence));

let purchaseChecked = 0;
let gapChecked = 0;
for (const page of registry.pages) {
  const body = html.get(page.path);
  if (!body) continue;
  const skus = new Set([...body.matchAll(skuPattern)].map((match) => match[1]).filter(Boolean));

  // Every book page must reach checkout. There is no longer a no-product branch:
  // a missing sku is a defect, not a supported state.
  if (!page.sku) { errors.push(`book page has no sku, so it reaches no purchase path: ${page.path}`); continue; }
  purchaseChecked += 1;
  const product = productBySku.get(page.sku);
  if (!product) { errors.push(`registry sku is not in data/products/products.json: ${page.path} -> ${page.sku}`); continue; }
  if (product.stripe_enabled !== true) errors.push(`registry sku is not sellable through Stripe: ${page.path} -> ${page.sku}`);
  if (!product.stripe_price_env) errors.push(`registry sku has no stripe_price_env: ${page.path} -> ${page.sku}`);
  const sellable = sellableSlugs.get(page.sku);
  if (!sellable) errors.push(`sku is not in the runtime seed catalogue, so checkout would reject it: ${page.path} -> ${page.sku}`);
  else if (sellable.status !== "live" || sellable.visibility !== "public") errors.push(`sku is not live and public in the runtime catalogue: ${page.path} -> ${page.sku} (${sellable.status}/${sellable.visibility})`);
  if (!skus.has(page.sku)) errors.push(`built page has no checkout button for its own sku: ${page.path} -> ${page.sku}`);
  for (const rendered of skus) {
    if (rendered !== page.sku) errors.push(`built page offers a sku that is not its companion product: ${page.path} -> ${rendered}`);
  }
  if (!body.includes("checkout-button")) errors.push(`built page has no checkout button at all: ${page.path}`);

  // A partial match has to say so, in the built HTML, before the reader pays.
  if (!page.productGap) continue;
  gapChecked += 1;
  if (!body.includes('data-product-gap="true"')) errors.push(`page declares a productGap but the built HTML has no gap notice: ${page.path}`);
  for (const sentence of page.productGap.split(". ").map((part) => part.trim()).filter((part) => part.length > 30)) {
    if (!onPage(body, sentence.replace(/\.$/, ""))) errors.push(`page does not print this productGap sentence: ${page.path} -> "${sentence.slice(0, 70)}..."`);
  }
}

/* ---------- reachability ---------- */

const indexHtml = html.get(INDEX_PATH);
let linksChecked = 0;
if (indexHtml) {
  for (const page of registry.pages) {
    if (!indexHtml.includes(`href="${page.path}"`)) errors.push(`the /amazon index does not link to ${page.path}`);
    else linksChecked += 1;
  }
}
for (const page of registry.pages) {
  const body = html.get(page.path);
  if (body && !body.includes(`href="${INDEX_PATH}"`)) errors.push(`page does not link back to the /amazon index: ${page.path}`);
}

/* ---------- published-URL posture, asserted both ways ---------- */

const sitemapFile = fs.existsSync(path.join(distDir, "sitemap.xml"))
  ? path.join(distDir, "sitemap.xml")
  : path.join(root, "public/sitemap.xml");
const sitemap = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile, "utf8") : "";
if (!sitemap) errors.push("no sitemap.xml found in dist/ or public/, so the sitemap posture cannot be checked");
let postureChecked = 0;
for (const routePath of ALL_PATHS) {
  const body = html.get(routePath);
  if (!body) continue;
  postureChecked += 1;
  const hasNoindex = /<meta\s+name="robots"\s+content="noindex/i.test(body);
  // Anchored on the closing tag: a bare prefix test makes /amazon match every
  // /amazon/<slug>/ entry and report the parent for a child's mistake.
  const inSitemap = sitemap.includes(`<loc>https://approvalprep.com${routePath}/</loc>`);
  if (EXPECT_INDEXED) {
    if (hasNoindex) errors.push(`page is marked noindex but the recorded decision is indexed: ${routePath}`);
    if (!inSitemap) errors.push(`page is not in the sitemap but the recorded decision is indexed: ${routePath}`);
  } else {
    if (!hasNoindex) errors.push(`page is missing its noindex directive: ${routePath}`);
    if (inSitemap) errors.push(`page is in the sitemap but is registered noindex - a crawled URL that tells the crawler to ignore it: ${routePath}`);
  }
  const canonical = (body.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (canonical !== `https://approvalprep.com${routePath}/`) errors.push(`canonical is ${canonical}, expected https://approvalprep.com${routePath}/ : ${routePath}`);
}

/* ---------- the pages really answer 200 ---------- */

const contentType = (file) => (file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "application/octet-stream");
const server = http.createServer((request, response) => {
  // Cloudflare Pages serves directory output: /foo/ resolves to foo/index.html.
  const url = new URL(request.url, "http://127.0.0.1");
  const candidate = path.join(distDir, url.pathname.replace(/^\//, ""), "index.html");
  if (fs.existsSync(candidate)) {
    response.writeHead(200, { "content-type": "text/html" });
    response.end(fs.readFileSync(candidate));
    return;
  }
  const direct = path.join(distDir, url.pathname.replace(/^\//, ""));
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    response.writeHead(200, { "content-type": contentType(direct) });
    response.end(fs.readFileSync(direct));
    return;
  }
  response.writeHead(404, { "content-type": "text/html" });
  response.end("<!doctype html><title>404</title>");
});

const statuses = new Map();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
for (const routePath of ALL_PATHS) {
  const status = await new Promise((resolve) => {
    http.get({ host: "127.0.0.1", port, path: `${routePath}/` }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on("error", () => resolve(0));
  });
  statuses.set(routePath, status);
  if (status !== 200) errors.push(`served status ${status} for ${routePath}/ , expected 200`);
}
await new Promise((resolve) => server.close(resolve));

/* ---------- rule 0: this must not pass having examined nothing ---------- */

if (SHIPPED_BOOK_PATHS.length !== 7) fail(`[amazon-book-landing-pages] the shipped path list holds ${SHIPPED_BOOK_PATHS.length} URLs, expected 7`);
if (routesChecked !== ALL_PATHS.length) errors.push(`only ${routesChecked} of ${ALL_PATHS.length} routes were registered and checked`);
if (filesChecked !== ALL_PATHS.length) errors.push(`only ${filesChecked} of ${ALL_PATHS.length} built pages were found and checked`);
if (statuses.size !== ALL_PATHS.length) errors.push(`only ${statuses.size} of ${ALL_PATHS.length} pages were fetched`);
if (postureChecked !== ALL_PATHS.length) errors.push(`only ${postureChecked} of ${ALL_PATHS.length} pages had their indexing posture checked`);
if (linksChecked !== SHIPPED_BOOK_PATHS.length) errors.push(`the /amazon index links to only ${linksChecked} of ${SHIPPED_BOOK_PATHS.length} book pages`);
if (purchaseChecked !== SHIPPED_BOOK_PATHS.length) errors.push(`only ${purchaseChecked} of ${SHIPPED_BOOK_PATHS.length} book pages had their purchase path checked`);
if (purchaseChecked === 0) errors.push("no page was checked for a working purchase path, so this validator proved nothing about checkout");
// The partial-match pages are the reason the honesty rule exists. If the registry
// stops declaring any gap, this loop would silently assert nothing, so the count
// is pinned to the registry rather than allowed to fall to zero unnoticed.
const gapPages = registry.pages.filter((page) => page.productGap).length;
if (gapChecked !== gapPages) errors.push(`only ${gapChecked} of ${gapPages} pages with a declared productGap had that gap checked in the built HTML`);
if (gapPages === 0) errors.push("no page declares a productGap - if every companion product is now an exact match, delete this rule deliberately rather than leaving it unexercised");

if (errors.length) fail(`[amazon-book-landing-pages] FAIL\n  - ${errors.join("\n  - ")}`);

const wired = registry.pages.filter((page) => page.sku).length;
console.log(`[amazon-book-landing-pages] OK books=${SHIPPED_BOOK_PATHS.length} pagesServed200=${statuses.size} wiredToStripe=${wired} liveInRuntimeCatalogue=${purchaseChecked} partialMatchGapsPrinted=${gapChecked} indexed=${EXPECT_INDEXED}`);
