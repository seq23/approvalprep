// The one way paid kit files reach R2, used by ops:r2:upload and ops:deploy.
//
// Nothing is uploaded unless every file about to be uploaded passes the kit
// safety checks first, on those exact bytes:
//   - the first-page self-service boundary (risk brain R-ADV-13)
//   - every bundled offering is inside the kit
//   - every kit price printed in a kit matches the price charged
// Any failure is the named stop [KIT_FIRST_PAGE_UNSAFE] and nothing is sent.
import fs from "node:fs";
import path from "node:path";
import { run } from "./exec.mjs";
import { productAssetKey } from "../../../functions/_runtime/asset-keys.js";
import { kitsDir, kitsDirPresent, kitsDirMissingMessage, listKitFiles, firstPageProblems, offeringCoverageProblems } from "../../lib/kits-dir.mjs";
import { sweepKitPrices } from "../../validate/_kit_price_surfaces.mjs";

const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));

// Returns the kit files to upload, or exits with a named stop.
export function gateKitsForUpload(dir = kitsDir()) {
  if (!kitsDirPresent(dir)) {
    console.error(kitsDirMissingMessage("kit upload", dir));
    process.exit(1);
  }
  const manifest = readJson("data/products/download_manifest.json");
  const catalog = readJson("data/products/full_offering_catalog.json");
  const seed = readJson("data/products/seed_product_registry.json");
  const skus = manifest.products.map((p) => p.sku);
  const files = listKitFiles(dir);
  const problems = [
    ...firstPageProblems(dir, skus),
    ...offeringCoverageProblems(dir, catalog.categories)
  ];
  const sweep = sweepKitPrices(seed.products, files.map((row) => row.file));
  problems.push(...sweep.problems);
  if (!files.length) problems.push(`${dir} contains no PDF or DOCX files`);
  if (problems.length) {
    console.error(`[KIT_FIRST_PAGE_UNSAFE] ${problems.length} problem(s) in ${dir}; nothing uploaded:`);
    for (const problem of problems.slice(0, 40)) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`[kits] safety checks passed on ${files.length} files in ${dir} (first page, offerings, prices)`);
  return files;
}

export function uploadKits(bucketName, dir = kitsDir()) {
  const files = gateKitsForUpload(dir);
  for (const row of files) {
    // Same rule the runtime resolves and the admin uploader writes.
    const key = productAssetKey(row.sku, row.ext);
    run("npx", ["wrangler", "r2", "object", "put", `${bucketName}/${key}`, "--file", row.file, "--remote"]);
  }
  console.log(`R2 product assets uploaded remotely: ${bucketName} files=${files.length}`);
  return files.length;
}
