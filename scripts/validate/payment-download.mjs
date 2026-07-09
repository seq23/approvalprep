#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { root, exists, fail } from "./_common.mjs";

if (exists("src/pages/api/create-checkout-session.ts") || exists("src/pages/api/verify-download.ts") || exists("src/pages/api/resend-download-email.ts")) {
  fail("[payment] static Astro POST API handlers are forbidden in output:static; use Cloudflare Pages Functions");
}

for (const file of ["functions/api/create-checkout-session.js", "functions/api/verify-download.js", "functions/api/resend-download-email.js"]) {
  if (!exists(file)) fail("[payment] missing Cloudflare Pages Function " + file);
}

if (exists("public/downloads")) fail("[payment] paid download assets must not be deployed from public/downloads");
const verify = fs.readFileSync(path.join(root, "functions/api/verify-download.js"), "utf8");
if (!verify.includes("NOT_VERIFIED") || !verify.includes("Stripe payment is verified")) fail("[payment] verify endpoint must block unverified downloads");
if (!verify.includes("/api/download-file")) fail("[payment] verified downloads must use entitlement-protected API links");
const checkout = fs.readFileSync(path.join(root, "functions/api/create-checkout-session.js"), "utf8");
if (!checkout.includes("metadata[sku]")) fail("[payment] checkout must write sku metadata used by verification");
const webhook = fs.readFileSync(path.join(root, "functions/api/stripe-webhook.js"), "utf8");
if (!webhook.includes("stripe-signature") || !webhook.includes("STRIPE_WEBHOOK_SECRET")) fail("[payment] Stripe webhook must verify signatures");
console.log("[payment] OK");
