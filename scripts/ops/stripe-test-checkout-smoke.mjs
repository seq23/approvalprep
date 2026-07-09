#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const base = (process.env.POSTDEPLOY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("POSTDEPLOY_BASE_URL is required");
const products = JSON.parse(readFileSync("data/products/products.json", "utf8")).products.filter((p) => p.status === "active_paid" && p.stripe_enabled);
const results = [];
for (const product of products) {
  const response = await fetch(`${base}/api/create-checkout-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sku: product.sku })
  });
  const raw = await response.text();
  let payload = {};
  try { payload = JSON.parse(raw); } catch {}
  const ok = response.ok && /checkout\.stripe\.com/.test(payload.checkoutUrl || "");
  const bodySnippet = raw.slice(0, 500);
  results.push({ sku: product.sku, status: response.status, ok, error: payload.error || "", message: payload.message || "", bodySnippet });
  if (!ok) console.error(`[stripe-test] ${product.sku} failed ${response.status} ${payload.error || ""} ${payload.message || ""} ${bodySnippet}`);
}
mkdirSync("reports/ops", { recursive: true });
writeFileSync("reports/ops/stripe-test-checkout-smoke.json", JSON.stringify({ baseUrl: base, ranAt: new Date().toISOString(), results }, null, 2) + "\n");
if (results.some((item) => !item.ok)) process.exit(1);
console.log(`[stripe-test] OK products=${results.length}`);
