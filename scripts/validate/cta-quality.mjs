#!/usr/bin/env node
import fs from "node:fs";
const banned = ["View download", "Learn more", "Submit", "Continue", "Click here"];
const files = ["src/pages/index.astro", "src/pages/[...slug].astro", "src/components/ProductGrid.astro", "src/components/ProductValueCard.astro", "src/components/OutcomeCTA.astro", "src/components/FinalCTA.astro"];
const offenders = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const label of banned) if (text.includes(label)) offenders.push(`${file}:${label}`);
}
if (offenders.length) throw new Error(`Weak customer CTA labels found: ${offenders.join(", ")}`);
const routes = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8")).routes;
const badRoutes = routes.filter((r) => r.type !== "admin" && r.allowed_cta_count !== "none" && !r.primary_cta);
if (badRoutes.length) throw new Error(`Routes missing primary CTA: ${badRoutes.map(r=>r.path).join(", ")}`);
console.log("[validate:cta-quality] OK");
