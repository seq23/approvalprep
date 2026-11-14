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

// The buyer's address may reach exactly one place: recordPurchase() in the webhook, which hashes
// it and hands one scheduled review ask to Resend without writing it to D1 (proved by
// scripts/validate/email-nurture.mjs). Any other use in entitlement code is a store risk.
for (const file of ["functions/api/verify-download.js", "functions/api/stripe-webhook.js"]) {
  const text = fs.readFileSync(file, "utf8");
  const uses = text.match(/customer_details\?\.email|session\.customer_email/g) || [];
  const allowed = file.endsWith("stripe-webhook.js") ? (text.match(/recordPurchase\(env, session\.customer_details\?\.email \|\| session\.customer_email,/g) || []).length * 2 : 0;
  if (uses.length > allowed) fail(`[data-privacy] local entitlement code must not store Stripe customer email: ${file}`);
}
if (/customer_email/.test(fs.readFileSync("functions/_runtime/nurture.js", "utf8"))) fail("[data-privacy] the email module must not touch customer_email columns");


const trackEvent = fs.existsSync("functions/api/track-event.js") ? fs.readFileSync("functions/api/track-event.js", "utf8") : "";
if (trackEvent) {
  for (const blocked of ["letterText", "documentText", "email", "phone", "name", "address", "ssn", "dob", "fullIp", "userAgentRaw", "freeText"]) {
    if (!trackEvent.includes(blocked)) fail(`[data-privacy] track-event missing blocked field guard: ${blocked}`);
  }
  for (const sensitive of ["customer_email", "user_agent", "request.headers.get('user-agent')", "cf-connecting-ip", "x-forwarded-for"]) {
    if (trackEvent.toLowerCase().includes(sensitive)) fail(`[data-privacy] track-event may capture sensitive header/data: ${sensitive}`);
  }
}

const downloadVerify = fs.readFileSync("functions/api/download-verify.js", "utf8");
if (downloadVerify.includes("SELECT *") || downloadVerify.includes("customer_email")) fail("[data-privacy] download-verify must not expose raw entitlement records");

const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
if (!fs.readFileSync("src/lib/checkoutButtons.mjs", "utf8").includes("body: JSON.stringify({ sku: button.dataset.sku, discount_code })")) fail("[data-privacy] checkout should only send SKU and optional discount code from public page");
if (/body:\s*JSON\.stringify\(\{[^}]*answer|body:\s*JSON\.stringify\(\{[^}]*document/i.test(layout)) fail("[data-privacy] checkout script appears to send customer document data");

const allowedOperational = [
  "functions/api/resend-download-email.js",
  // Hashed rate-limit counters only (bucket names carry SHA-256 hashes, never an IP or address).
  "functions/_runtime/rate-limit.js",
  "functions/api/track-event.js",
  "functions/api/admin/",
  "functions/_runtime/admin.js",
  "functions/_runtime/catalog.js",
  // Typed-in sample sign-ups and hashes only; scripts/validate/email-nurture.mjs proves a
  // buyer's address is never written.
  "functions/_runtime/nurture.js",
  // Marks a refunded session's entitlement revoked; writes no email or answers (customer_email is '').
  "functions/_runtime/refunds.js"
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
