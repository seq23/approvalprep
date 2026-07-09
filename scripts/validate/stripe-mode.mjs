#!/usr/bin/env node
import fs from "node:fs";
import { fail, readJson } from "./_common.mjs";

const seed = readJson("data/products/seed_product_registry.json").products;
const live = seed.filter((p) => p.status === "live");
for (const product of live) {
  for (const key of ["stripeLivePriceId", "stripeTestPriceId", "stripeLiveProductId", "stripeTestProductId"]) {
    if (!product[key]) fail(`[stripe-mode] live product ${product.slug} missing ${key}`);
  }
}

const checkout = fs.readFileSync("functions/api/create-checkout-session.js", "utf8");
const stripe = fs.readFileSync("functions/_runtime/stripe.js", "utf8");
for (const token of ["stripeTestPriceId", "stripeLivePriceId", "getStripeMode", "assertStripeModeMatchesKey", "MISSING_STRIPE_TEST_PRICE", "MISSING_STRIPE_LIVE_PRICE"]) {
  if (!checkout.includes(token) && !stripe.includes(token)) fail(`[stripe-mode] checkout missing ${token}`);
}
if (!fs.readFileSync(".env.example", "utf8").includes("STRIPE_MODE=test")) fail("[stripe-mode] .env.example missing STRIPE_MODE=test");
console.log(`[stripe-mode] OK products=${live.length}`);
