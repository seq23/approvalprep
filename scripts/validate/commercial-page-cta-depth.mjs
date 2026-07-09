#!/usr/bin/env node
import fs from "node:fs";
import { fail } from "./_common.mjs";

const dynamic = fs.readFileSync("src/pages/[...slug].astro", "utf8");
const home = fs.readFileSync("src/pages/index.astro", "utf8");
const components = [
  fs.readFileSync("src/components/FinalCTA.astro", "utf8"),
  fs.readFileSync("src/components/PricingDeck.astro", "utf8")
].join("\n");
for (const token of ["OutcomeCTA", "PageCTAStack", "FinalCTA", "PricingDeck", "checkout-button", "Start free for $0"]) {
  if (!dynamic.includes(token) && !home.includes(token) && !components.includes(token)) fail(`[commercial-cta-depth] missing ${token}`);
}
for (const token of ["8 checkout products", "50 named self-service tools", "Opens secure Stripe checkout", "Buy {product.name} — {product.priceLabel}", "primaryCtaWithPrice", "fill-in placeholders", "prefilled first-pass draft"]) {
  if (!dynamic.includes(token) && !components.includes(token)) fail(`[commercial-cta-depth] missing pricing clarity token: ${token}`);
}
for (const token of ["ProblemAgitationFit", "WhatHappensAfterPurchase", "TrustAndBoundaryBand", "IncludedOfferings"]) {
  if (!dynamic.includes(token)) fail(`[commercial-cta-depth] commercial template missing ${token}`);
}
console.log("[commercial-cta-depth] OK");
