#!/usr/bin/env node
import fs from "node:fs";
import { fail, readJson } from "./_common.mjs";

const catalog = readJson("data/products/full_offering_catalog.json");
const offerings = catalog.categories.flatMap((category) => category.offerings.map((offering) => offering.name || offering));
if (offerings.length < 30) fail(`[offering-visibility] expected at least 30 offerings, found ${offerings.length}`);
for (const category of catalog.categories) {
  if (!category.product_sku || !category.product_name || !category.offerings?.length) fail("[offering-visibility] incomplete category");
  for (const offering of category.offerings) {
    for (const key of ["name", "customerSituation", "includedInSku", "ctaLabel", "riskBoundary", "searchIntent"]) {
      if (!offering[key]) fail(`[offering-visibility] ${category.product_sku} offering missing ${key}`);
    }
  }
}
const files = ["src/components/OfferingUniverse.astro", "src/components/IncludedOfferings.astro", "src/pages/index.astro", "src/pages/[...slug].astro"].map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const token of ["OfferingUniverse", "IncludedOfferings", "30+ self-service", "offeringCategories"]) {
  if (!files.includes(token)) fail(`[offering-visibility] public UI missing ${token}`);
}
console.log(`[offering-visibility] OK offerings=${offerings.length}`);
