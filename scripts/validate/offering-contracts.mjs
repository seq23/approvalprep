#!/usr/bin/env node
import fs from "node:fs";
import { fail, readJson, exists } from "./_common.mjs";
import { productAssetKey } from "../../functions/_runtime/asset-keys.js";
import { kitsDir, kitsMode, kitPath, CI_NOTE } from "../lib/kits-dir.mjs";

const kitFilesMode = kitsMode("offering-contracts");

const catalog = readJson("data/products/full_offering_catalog.json");
const registry = readJson("data/products/offering_contract_registry.json");
const downloads = readJson("data/products/download_manifest.json");
const downloadBySku = new Map(downloads.products.map((item) => [item.sku, item]));
const expected = catalog.categories.flatMap((category) =>
  category.offerings.map((offering) => ({
    id: `${category.product_sku}__${String(offering.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90)}`,
    productSku: category.product_sku,
    name: offering.name
  }))
);

if (registry.offeringCount !== expected.length) fail(`[offering-contracts] registry count mismatch: ${registry.offeringCount} vs ${expected.length}`);
if (registry.contracts.length !== expected.length) fail("[offering-contracts] contract row count mismatch");

const contracts = new Map(registry.contracts.map((item) => [item.id, item]));
for (const item of expected) {
  const contract = contracts.get(item.id);
  if (!contract) fail(`[offering-contracts] missing contract for ${item.id}`);
  if (!contract.reviewDoc || !exists(contract.reviewDoc)) fail(`[offering-contracts] missing review doc for ${item.id}`);
  if (contract.deliveryModel !== "direct_paid_download" || contract.studioRequired !== false) fail(`[offering-contracts] ${item.id} must be a direct paid download and not Studio-gated`);
  const doc = fs.readFileSync(contract.reviewDoc, "utf8");
  for (const token of ["How Purchase Works", "Direct paid download", "Studio not required", "Reviewable Files", "Contract Standard", "Safety Boundary", "Proof Boundary"]) {
    if (!doc.includes(token)) fail(`[offering-contracts] ${contract.reviewDoc} missing ${token}`);
  }
  const asset = downloadBySku.get(item.productSku);
  if (!asset) fail(`[offering-contracts] missing download manifest asset for ${item.productSku}`);
  for (const ext of ["pdf", "docx"]) {
    // The kit files are private (APPROVALPREP_KITS_DIR); the review doc names
    // the R2 key the uploader writes, never a repo path to the paid file.
    const key = productAssetKey(item.productSku, ext);
    if (kitFilesMode === "files" && !fs.existsSync(kitPath(item.productSku, ext))) fail(`[offering-contracts] missing ${ext} asset for ${item.productSku} in ${kitsDir()}`);
    if (!doc.includes(key)) fail(`[offering-contracts] ${contract.reviewDoc} does not name R2 key ${key}`);
    if (contract.reviewableAssets?.[ext] !== key) fail(`[offering-contracts] ${item.id} reviewableAssets.${ext} must be ${key}`);
  }
  if (doc.includes("seed-downloads/")) fail(`[offering-contracts] ${contract.reviewDoc} links a paid file path; the kits are not in this repository`);
  for (const phrase of ["no fake documents", "no third-party contact", "no professional advice", "no approval guarantee"]) {
    const haystack = JSON.stringify(contract).toLowerCase() + "\n" + doc.toLowerCase();
    if (!haystack.includes(phrase)) fail(`[offering-contracts] missing safety phrase "${phrase}" for ${item.id}`);
  }
}

for (const file of ["docs/offerings/OFFERING_REGISTRY.md", "docs/offerings/OFFERING_STANDARD.md", "docs/offerings/DOWNLOAD_ASSET_REVIEW_INDEX.md"]) {
  if (!exists(file)) fail(`[offering-contracts] missing ${file}`);
}

console.log(`[offering-contracts] OK offerings=${expected.length} products=${catalog.categories.length}${kitFilesMode === "contract" ? `; ${CI_NOTE}` : ""}`);
