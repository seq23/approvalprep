#!/usr/bin/env node
import fs from "node:fs";
import { fail, readJson, walk } from "./_common.mjs";

const boundary = readJson("data/legal/self_service_boundary.json");
for (const key of ["dataBoundary", "dataDoesNotStore", "limitedOperationalRecords"]) {
  if (!boundary[key] || (Array.isArray(boundary[key]) && boundary[key].length < 3)) fail(`[data-privacy] missing ${key}`);
}

const requiredCopy = [
  "does not store your letter answers",
  "completed worksheets",
  "uploaded personal documents",
  "limited operational records"
];
for (const file of ["src/components/DataPrivacyNotice.astro", "src/layouts/BaseLayout.astro", "src/pages/index.astro", "src/pages/[...slug].astro", "data/legal/self_service_boundary.json"]) {
  const text = fs.readFileSync(file, "utf8").toLowerCase();
  const missing = requiredCopy.filter((token) => !text.includes(token));
  if (file.endsWith("DataPrivacyNotice.astro")) {
    if (!text.includes("dataBoundary".toLowerCase()) || !text.includes("dataDoesNotStore".toLowerCase()) || !text.includes("limitedOperationalRecords".toLowerCase())) fail("[data-privacy] notice component is not wired to boundary data");
  } else if (file.includes("self_service_boundary")) {
    if (missing.length) fail(`[data-privacy] boundary data missing privacy token(s): ${missing.join(", ")}`);
  }
}

for (const file of ["functions/api/verify-download.js", "functions/api/stripe-webhook.js"]) {
  const text = fs.readFileSync(file, "utf8");
  if (/customer_details\?\.email|session\.customer_email/.test(text)) fail(`[data-privacy] local entitlement code must not store Stripe customer email: ${file}`);
}

const downloadVerify = fs.readFileSync("functions/api/download-verify.js", "utf8");
if (downloadVerify.includes("SELECT *") || downloadVerify.includes("customer_email")) fail("[data-privacy] download-verify must not expose raw entitlement records");

const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
if (!layout.includes("body: JSON.stringify({ sku: button.dataset.sku, discount_code })")) fail("[data-privacy] checkout should only send SKU and optional discount code from public page");
if (!layout.includes("product SKU and optional discount code")) fail("[data-privacy] checkout privacy copy must disclose SKU plus optional discount code only");
if (/body:\s*JSON\.stringify\(\{[^}]*answer|body:\s*JSON\.stringify\(\{[^}]*document/i.test(layout)) fail("[data-privacy] checkout script appears to send customer document data");

const allowedOperational = [
  "functions/api/resend-download-email.js",
  "functions/api/admin/",
  "functions/_runtime/admin.js",
  "functions/_runtime/catalog.js"
];
for (const file of walk("functions").filter((item) => item.endsWith(".js"))) {
  const text = fs.readFileSync(file, "utf8");
  const stores = /INSERT|UPDATE/.test(text) || text.includes(".put(");
  if (!stores) continue;
  const allowed = allowedOperational.some((prefix) => file.includes(prefix)) || file.endsWith("functions/api/verify-download.js") || file.endsWith("functions/api/stripe-webhook.js");
  if (!allowed) fail(`[data-privacy] unexpected storage write path: ${file}`);
}

const products = readJson("data/products/products.json").products || [];
for (const product of products.filter((item) => item.status !== "draft")) {
  if (!product.trust_signals?.includes("No stored letter answers")) fail(`[data-privacy] product missing no stored answers trust signal: ${product.sku}`);
}

console.log("[data-privacy] OK");
