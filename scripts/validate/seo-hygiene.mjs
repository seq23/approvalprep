#!/usr/bin/env node
/**
 * validate:seo-hygiene:jsonld (restored 10 Nov 2026, hostile review: Product prices only), over
 * the BUILT site (dist/):
 *   - every Product offers.price (USD) equals its kit's price in data/products/products.json;
 *   - that price is visible on the page;
 *   - no Product carries review or aggregateRating (there are none to cite).
 * Hard-fails on zero pages, zero paid kits or zero Product nodes, so an empty dist/ cannot pass.
 * Usage: node scripts/validate/seo-hygiene.mjs jsonld
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const errors = [];
const fail = (msg) => errors.push(msg);
const norm = (p) => (String(p || "").replace(/\/+$/, "") || "/");

function pages() {
  if (!fs.existsSync(DIST)) throw new Error("dist/ missing - run npm run build first");
  const out = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "index.html") out.set(norm("/" + path.relative(DIST, dir).split(path.sep).join("/")), fs.readFileSync(full, "utf8"));
    }
  };
  walk(DIST);
  return out;
}
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const visibleText = (html) => decode(html.replace(/<head[\s\S]*?<\/head>/i, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
function jsonld(html, where) {
  const nodes = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const stack = [JSON.parse(m[1])];
      while (stack.length) {
        const n = stack.pop();
        if (Array.isArray(n)) stack.push(...n);
        else if (n && typeof n === "object") {
          if (n["@graph"]) stack.push(n["@graph"]);
          if (n["@type"]) nodes.push(n);
        }
      }
    } catch (e) { fail(`[jsonld] ${where}: unparseable JSON-LD block (${e.message})`); }
  }
  return nodes;
}

const checks = {
  jsonld(all) {
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/products/products.json"), "utf8"));
    const kitPrices = new Map(catalog.products.filter((x) => x.status === "active_paid" && x.stripe_enabled).map((x) => [x.sku, String(x.priceLabel || "").replace(/[^0-9.]/g, "")]));
    if (!kitPrices.size) fail("[jsonld] no paid kits in data/products/products.json");
    let productNodes = 0;
    for (const [p, html] of all) {
      const text = visibleText(html);
      for (const product of jsonld(html, p).filter((x) => x["@type"] === "Product")) {
        productNodes++;
        const kit = kitPrices.get(product.sku);
        const offers = [].concat(product.offers || []);
        if (!kit) fail(`[jsonld] ${p}: Product "${product.name}" sku "${product.sku}" is not a paid kit in data/products/products.json`);
        if (product.review || product.aggregateRating) fail(`[jsonld] ${p}: Product "${product.name}" carries review/aggregateRating; there are none to cite`);
        if (!offers.length) fail(`[jsonld] ${p}: Product "${product.name}" has no offers`);
        for (const offer of offers) {
          if (offer.priceCurrency !== "USD") fail(`[jsonld] ${p}: Product "${product.name}" offer priceCurrency is "${offer.priceCurrency}", not USD`);
          if (kit && String(offer.price) !== kit) fail(`[jsonld] ${p}: Product "${product.name}" offer price ${offer.price} != kit price data ${kit}`);
          const price = String(offer.price || "").replace(/\.0+$/, "");
          if (!price || !text.includes(`$${price}`)) fail(`[jsonld] ${p}: Product offer price $${price} is not shown on the page`);
        }
      }
    }
    if (!productNodes) fail("[jsonld] no Product nodes in the built site");
    return productNodes;
  },
};

const which = process.argv[2] || "jsonld";
const names = which === "all" ? Object.keys(checks) : [which];
for (const name of names) if (!checks[name]) { console.error(`[seo-hygiene] unknown check "${name}"; one of ${Object.keys(checks).join(", ")}`); process.exit(2); }
let all;
try { all = pages(); } catch (e) { console.error(`[seo-hygiene] ${e.message}`); process.exit(1); }
if (!all.size) { console.error("[seo-hygiene] dist/ has no pages"); process.exit(1); }
const counts = {};
for (const name of names) counts[name] = checks[name](all) || 0;
for (const name of names) if (!counts[name]) fail(`[${name}] checked zero items`);
if (errors.length) {
  console.error(`[seo-hygiene] FAIL ${names.join(",")}: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 40)) console.error("  " + e);
  process.exit(1);
}
console.log(`[seo-hygiene] OK ${names.map((n) => `${n}=${counts[n]} Product node(s)`).join(" ")}`);
