#!/usr/bin/env node
// Every offering a kit promises is inside the DOCX the buyer gets. The kit
// files live in APPROVALPREP_KITS_DIR (scripts/lib/kits-dir.mjs); in CI they
// are absent, so this checks the generator source and says so, and the file
// check runs again at upload (scripts/ops/lib/upload-kits.mjs).
import fs from "node:fs";
import { fail, readJson } from "./_common.mjs";
import { kitsDir, kitsMode, kitPath, pdfPageCount, offeringCoverageProblems, CI_NOTE } from "../lib/kits-dir.mjs";

const catalog = readJson("data/products/full_offering_catalog.json");
const offerings = catalog.categories.flatMap((item) => item.offerings).length;
if (!catalog.categories.length || !offerings) fail("[download-offering-coverage] full offering catalog lists no offerings");

const generator = fs.readFileSync("scripts/generate_consumer_downloads.py", "utf8");
for (const token of ["for item in product.get('included_offerings', [])", "flow.append(P(item.title(), 'H2x'))", "doc.add_heading(item.title(), level=2)"]) {
  if (!generator.includes(token)) fail(`[download-offering-coverage] generator missing bundled offering token: ${token}`);
}

if (kitsMode("download-offering-coverage") === "contract") {
  console.log(`[download-offering-coverage] OK contract products=${catalog.categories.length} offerings=${offerings}; ${CI_NOTE}`);
  process.exit(0);
}

const dir = kitsDir();
for (const category of catalog.categories) {
  const pdf = kitPath(category.product_sku, "pdf", dir);
  if (!fs.existsSync(pdf)) fail(`[download-offering-coverage] missing bundled files for ${category.product_sku}`);
  if (fs.statSync(pdf).size < 5000 || pdfPageCount(pdf) < 2) fail(`[download-offering-coverage] ${pdf} does not look like a complete PDF kit`);
}
const problems = offeringCoverageProblems(dir, catalog.categories);
if (problems.length) fail(`[download-offering-coverage] ${problems.slice(0, 40).join("\n  ")}`);

console.log(`[download-offering-coverage] OK products=${catalog.categories.length} offerings=${offerings}`);
