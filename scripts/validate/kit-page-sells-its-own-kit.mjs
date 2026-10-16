#!/usr/bin/env node
// Every paid kit's own page must sell that kit. 16 Oct 2026: /life-admin-letter-kit/
// sold the $15 Letter of Explanation kit because the keyword map in
// src/lib/skuForRoute.mjs had no rule for "life-admin". This runs the real
// function the page uses against every kit path in the route manifest.
import fs from "node:fs";
import { skuForRoute, paidSkusFrom } from "../../src/lib/skuForRoute.mjs";

const products = JSON.parse(fs.readFileSync("data/products/products.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const priority = JSON.parse(fs.readFileSync("data/content/priority_pages.json", "utf8")).pages || {};
const routes = Array.isArray(manifest) ? manifest : manifest.routes;
const paidSkus = paidSkusFrom(products);
const errors = [];
if (paidSkus.length === 0) errors.push("no active_paid products found in data/products/products.json");
let checked = 0;
for (const sku of paidSkus) {
  const path = `/${sku}`;
  if (!routes.some((r) => r.path === path || r.path === `${path}/`)) continue;
  checked++;
  const got = skuForRoute(path, { priorityEntry: priority[path] || null, paidSkus });
  if (got !== sku) errors.push(`${path} sells "${got}", not its own kit "${sku}"`);
}
if (checked === 0) errors.push("no kit page found in data/routes/route_manifest.json");
if (errors.length) { console.error(`[kit-page-sells-its-own-kit] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[kit-page-sells-its-own-kit] OK ${checked} kit pages sell their own kit`);
