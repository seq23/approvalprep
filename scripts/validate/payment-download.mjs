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

const publicDownloads = path.join(root, "public/downloads");
if (exists("public/downloads")) {
  const publicFiles = [];
  function walkPublicDownloads(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkPublicDownloads(full);
      else publicFiles.push(full);
    }
  }
  walkPublicDownloads(publicDownloads);
  for (const file of publicFiles) {
    const rel = path.relative(root, file);
    if (/\.(pdf|docx)$/i.test(file) || !rel.startsWith("public/downloads/free-checklists/")) {
      fail(`[payment] paid download assets must not be deployed from public/downloads: ${rel}`);
    }
  }
}
const verify = fs.readFileSync(path.join(root, "functions/api/verify-download.js"), "utf8");
if (!verify.includes("PAYMENT_NOT_COMPLETED") || !verify.includes("PAYMENT_PENDING")) fail("[payment] verify endpoint must distinguish unpaid sessions from pending Stripe verification");
if (!verify.includes("findPaidEntitlement") || !verify.includes('status: "VERIFIED"')) fail("[payment] verify endpoint must support paid entitlement lookup before releasing downloads");
if (!verify.includes("/api/download-file")) fail("[payment] verified downloads must use entitlement-protected API links");
const checkout = fs.readFileSync(path.join(root, "functions/api/create-checkout-session.js"), "utf8");
if (!checkout.includes("metadata[sku]")) fail("[payment] checkout must write sku metadata used by verification");
if (!checkout.includes("discount_code") || !checkout.includes("promotion_codes") || !checkout.includes("allow_promotion_codes")) fail("[payment] checkout must support Stripe promotion codes and optional customer-entered discount code");
const webhook = fs.readFileSync(path.join(root, "functions/api/stripe-webhook.js"), "utf8");
if (!webhook.includes("stripe-signature") || !webhook.includes("STRIPE_WEBHOOK_SECRET")) fail("[payment] Stripe webhook must verify signatures");
const layout = fs.readFileSync(path.join(root, "src/layouts/BaseLayout.astro"), "utf8");
if (!layout.includes("Return to pricing and complete checkout") || !layout.includes("until Stripe confirms this session as paid")) fail("[payment] checkout success UI must explain unconfirmed sessions and send customers back to checkout or support");
// Buy buttons: the promo code is sent, and coming Back from Stripe leaves the button ready again.
{
  const { beginCheckout, restoreCheckoutButtons, OPENING_LABEL } = await import("../../src/lib/checkoutButtons.mjs");
  if (!fs.readFileSync(path.join(root, "src/lib/checkoutButtons.mjs"), "utf8").includes("discount_code")) fail("[payment] checkout JS must submit discount_code when present");
  if (!layout.includes("initCheckoutButtons")) fail("[payment] the layout must start the Buy buttons");
  const button = { dataset: {}, textContent: "Buy Credit Letter Kit — $19", disabled: false };
  beginCheckout(button); beginCheckout(button);
  if (!button.disabled || button.textContent !== OPENING_LABEL) fail("[payment] a pressed Buy button must show it is opening the payment page");
  restoreCheckoutButtons([button]);
  if (button.disabled || button.textContent !== "Buy Credit Letter Kit — $19" || "label" in button.dataset) fail("[payment] back from Stripe must restore the Buy button");
}
if (!layout.includes("Optional: prefill a draft in the Studio") || !layout.includes("Download editable Word document")) fail("[payment] verified checkout UI must offer both direct template download and optional browser-only prefill path");
const slugPage = fs.readFileSync(path.join(root, "src/pages/[...slug].astro"), "utf8");
if (!slugPage.includes("If Stripe has not confirmed this checkout session as paid") || !slugPage.includes("download the blank/editable templates")) fail("[payment] checkout success page must explain paid-download versus optional prefill choice");
if (!slugPage.includes("data-discount-code")) fail("[payment] pricing page must keep the promo code field");
// Money leak guard: no test or 100%-off code is ever printed to customers. Scans every source that
// can reach a page or an API response, and the built site when it exists.
{
  const leak = /TEST100|test-mode|test mode fulfil/i;
  const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
  const sources = [...walk(path.join(root, "src")), ...walk(path.join(root, "functions")), ...walk(path.join(root, "public"))].filter((f) => /\.(astro|js|mjs|ts|json|md|mdx|html|txt)$/.test(f));
  const built = walk(path.join(root, "dist")).filter((f) => f.endsWith(".html"));
  if (sources.length < 20) fail("[payment] test-code leak guard read too few source files: " + sources.length);
  for (const file of [...sources, ...built]) {
    if (leak.test(fs.readFileSync(file, "utf8"))) fail("[payment] customer-visible test or 100%-off code text in " + path.relative(root, file));
  }
}
// The checkout E2E must never run a discount code against live Stripe.
{
  const { discountCheckDecision } = await import("../ops/checkout-e2e-discount-guard.mjs");
  if (discountCheckDecision({ code: "ANYCODE", fullPriceSessionId: "cs_live_abc" }).run !== false) fail("[payment] checkout E2E must refuse the discount path against live Stripe");
  if (discountCheckDecision({ code: "ANYCODE", fullPriceSessionId: "" }).run !== false) fail("[payment] checkout E2E must refuse the discount path when the Stripe mode is unknown");
  if (discountCheckDecision({ code: "", fullPriceSessionId: "cs_test_abc" }).run !== false) fail("[payment] checkout E2E must not invent a discount code");
  if (discountCheckDecision({ code: "ANYCODE", fullPriceSessionId: "cs_test_abc" }).run !== true) fail("[payment] checkout E2E must still run the discount path in Stripe test mode");
}

const homepage = fs.readFileSync(path.join(root, "src/pages/index.astro"), "utf8");
for (const token of ["After checkout, you choose", "Option A: Download now", "Option B: Use the free Studio", "replace the placeholders with your true facts"]) {
  if (!homepage.includes(token)) fail("[payment] homepage must clearly explain direct download versus Studio prefill option: " + token);
}
if (!slugPage.includes("Success! Your checkout is complete.") || !slugPage.includes("Your download options") || !slugPage.includes("What happens next:")) fail("[payment] checkout success page must look and read like a successful checkout screen");

if (!verify.includes("no_payment_required") || !verify.includes("stripe_zero_dollar_promotion")) fail("[payment] verify endpoint must treat completed 100% off Stripe sessions as valid download unlocks");
const smoke = fs.readFileSync(path.join(root, "scripts/ops/stripe-test-checkout-smoke.mjs"), "utf8");
if (!smoke.includes("checkout_session_creation_only")) fail("[payment] Stripe smoke test must state that it proves checkout session creation, not completed payment/download delivery");
const packageJson = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!packageJson.includes("ops:local:checkout-download-e2e")) fail("[payment] package scripts must expose the local checkout/download E2E operator test");
const localE2E = fs.readFileSync(path.join(root, "scripts/ops/local-checkout-download-e2e.mjs"), "utf8");
for (const token of ["LOCAL_E2E_COMPLETED_SESSION_ID", "LOCAL_E2E_COMPLETED_SKU", "discountCheckDecision", "discount_code", "/api/verify-download", "/api/download-file", "PASS_COMPLETED_CHECKOUT_AND_PROTECTED_DOWNLOAD_PROOF", "PASS_CHECKOUT_CREATION_AND_SUCCESS_UI_ONLY", "LOCAL_E2E_FIXTURE_ONLY", "PASS_CHECKOUT_CREATION_SUCCESS_UI_AND_FIXTURE_FULFILLMENT", "reports/ops/local-checkout-download-e2e.json"]) {
  if (!localE2E.includes(token)) fail("[payment] local checkout/download E2E script missing required proof token: " + token);
}
const localE2EDoc = fs.readFileSync(path.join(root, "docs/products/LOCAL_CHECKOUT_DOWNLOAD_E2E.md"), "utf8");
for (const token of ["Checkout creation plus success-page UI proof", "Completed-session protected download proof", "Fixture fulfillment fallback proof", "LOCAL_E2E_FIXTURE_ONLY", "cs_test_", "That is not download proof"]) {
  if (!localE2EDoc.includes(token)) fail("[payment] local checkout/download E2E docs missing required operator guidance: " + token);
}
console.log("[payment] OK");
