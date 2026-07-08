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

const verify = fs.readFileSync(path.join(root, "functions/api/verify-download.js"), "utf8");
if (!verify.includes("NOT_VERIFIED") || !verify.includes("Stripe payment is verified")) fail("[payment] verify endpoint must block unverified downloads");
console.log("[payment] OK");
