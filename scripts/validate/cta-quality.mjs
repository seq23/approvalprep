#!/usr/bin/env node
import fs from "node:fs";
const banned = ["View download", "Learn more", "Submit", "Continue", "Click here"];
const files = ["src/pages/index.astro", "src/pages/[...slug].astro", "src/components/ProductGrid.astro", "src/components/ProductValueCard.astro", "src/components/OutcomeCTA.astro", "src/components/FinalCTA.astro", "src/components/PricingDeck.astro", "src/components/PageCTAStack.astro", "src/components/GuidePlaybook.astro"];
const offenders = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const label of banned) if (text.includes(label)) offenders.push(`${file}:${label}`);
}
if (offenders.length) throw new Error(`Weak customer CTA labels found: ${offenders.join(", ")}`);
const routes = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8")).routes;
const badRoutes = routes.filter((r) => r.type !== "admin" && r.allowed_cta_count !== "none" && !r.primary_cta);
if (badRoutes.length) throw new Error(`Routes missing primary CTA: ${badRoutes.map(r=>r.path).join(", ")}`);
const pricingDeck = fs.readFileSync("src/components/PricingDeck.astro", "utf8");
if (!pricingDeck.includes("Buy {product.name} — {product.priceLabel}") || !pricingDeck.includes("Opens secure Stripe checkout") || !pricingDeck.includes("Direct paid download")) {
  throw new Error("Pricing deck CTAs must include price and checkout destination context");
}
const dynamic = fs.readFileSync("src/pages/[...slug].astro", "utf8");
if (!dynamic.includes("primaryCtaWithPrice") || !dynamic.includes("56 named self-service tools")) {
  throw new Error("Dynamic pricing/commercial pages must explain priced kit model and use price-aware CTAs");
}
const studio = fs.readFileSync("src/components/LetterStudio.astro", "utf8");
if (!pricingDeck.includes("$39 direct download") || !studio.includes("You do not have to use the Studio to buy it")) {
  throw new Error("Letter of Explanation Kit must be clearly sold as a direct $39 download, not a Studio-gated purchase");
}
console.log("[validate:cta-quality] OK");
