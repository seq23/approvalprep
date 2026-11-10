#!/usr/bin/env node
// Every paid kit opens with the self-service boundary (risk brain R-ADV-13).
//
// The kit files live outside this public repository, in APPROVALPREP_KITS_DIR
// (scripts/lib/kits-dir.mjs). Three modes:
//   - kits present: check every kit file there (the full check).
//   - CI, kits absent: check the public contract (manifest, registry, R2 keys,
//     generator disclaimer source) and print CI_NOTE. The file check then runs
//     at upload: scripts/ops/lib/upload-kits.mjs refuses [KIT_FIRST_PAGE_UNSAFE].
//   - kits absent anywhere else: the named stop [KITS_DIR_MISSING].
// The self-test (always run first; alone with --self-test) proves the check
// fails on a kit that is missing the wording, and passes on one that has it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fail, readJson } from "./_common.mjs";
import { productAssetKey, DOWNLOAD_TYPES } from "../../functions/_runtime/asset-keys.js";
import { kitsDir, kitsMode, firstPageProblems, FIRST_PAGE_PHRASES, CI_NOTE } from "../lib/kits-dir.mjs";

const TAG = "[download-first-page-boundary]";

// --- self-test --------------------------------------------------------------
// A minimal stored (uncompressed) zip holding word/document.xml.
function fixtureDocx(text) {
  const name = Buffer.from("word/document.xml");
  const body = Buffer.from(`<w:document><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(body.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(body.length, 24);
  central.writeUInt16LE(name.length, 28);
  const centralOffset = local.length + name.length + body.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + name.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, name, body, central, name, eocd]);
}

function fixturePdf() {
  return Buffer.from(`%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n2 0 obj << /Type /Page >> endobj\n${"%".repeat(6000)}\n%%EOF\n`, "latin1");
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ap-kit-selftest-"));
  const write = (dir, sku, phrases) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${sku}.pdf`), fixturePdf());
    fs.writeFileSync(path.join(dir, `${sku}.docx`), fixtureDocx(phrases.join(". ")));
  };
  try {
    const good = path.join(tmp, "good");
    write(good, "fixture-kit", FIRST_PAGE_PHRASES);
    const goodProblems = firstPageProblems(good, ["fixture-kit"]);
    if (goodProblems.length) fail(`${TAG} self-test: a kit carrying every boundary phrase was refused: ${goodProblems[0]}`);

    const unsafe = path.join(tmp, "unsafe");
    write(unsafe, "fixture-kit", FIRST_PAGE_PHRASES.filter((p) => p !== "credit repair company"));
    const unsafeProblems = firstPageProblems(unsafe, ["fixture-kit"]);
    if (!unsafeProblems.some((p) => p.includes("credit repair company"))) fail(`${TAG} self-test: a kit missing "credit repair company" passed`);

    const stray = path.join(tmp, "stray");
    write(stray, "fixture-kit", FIRST_PAGE_PHRASES);
    write(stray, "unlisted-kit", []);
    if (!firstPageProblems(stray, ["fixture-kit"]).some((p) => p.includes("not a kit in the download manifest"))) fail(`${TAG} self-test: an unchecked extra file in the kits folder passed`);

    const missing = path.join(tmp, "missing");
    fs.mkdirSync(missing);
    if (!firstPageProblems(missing, ["fixture-kit"]).length) fail(`${TAG} self-test: an empty kits folder passed`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`${TAG} self-test OK (unsafe kit refused, stray file refused, empty folder refused, safe kit passed)`);
}

selfTest();
if (process.argv.includes("--self-test")) process.exit(0);

// --- the public contract (always checked) -----------------------------------
const manifest = readJson("data/products/download_manifest.json");
const catalog = readJson("data/products/product_catalog.json");
const registry = readJson("data/products/offering_contract_registry.json");
const skus = manifest.products.map((p) => p.sku);
const activePaid = catalog.products.filter((p) => p.status === "active_paid").map((p) => p.sku).sort();
if (!skus.length) fail(`${TAG} download manifest lists no products`);
if (JSON.stringify([...skus].sort()) !== JSON.stringify(activePaid)) fail(`${TAG} manifest SKUs ${skus.join(",")} differ from active paid catalog ${activePaid.join(",")}`);
for (const product of manifest.products) {
  if (!Array.isArray(product.firstPageRequires) || product.firstPageRequires.length < 5) fail(`${TAG} ${product.sku} manifest does not declare its first-page boundary`);
  const expected = DOWNLOAD_TYPES.map((type) => productAssetKey(product.sku, type));
  if (JSON.stringify(product.r2Keys) !== JSON.stringify(expected)) fail(`${TAG} ${product.sku} manifest r2Keys ${JSON.stringify(product.r2Keys)}; the uploader writes ${JSON.stringify(expected)}`);
}
for (const contract of registry.contracts) {
  if (!skus.includes(contract.productSku)) fail(`${TAG} registry ${contract.id} names kit ${contract.productSku}, not in the manifest`);
  const expected = DOWNLOAD_TYPES.map((type) => productAssetKey(contract.productSku, type));
  if (JSON.stringify(contract.reviewableAssets?.r2Keys) !== JSON.stringify(expected)) fail(`${TAG} registry ${contract.id} r2Keys disagree with the uploader's keys`);
}
const contractDoc = fs.readFileSync("docs/offerings/OFFERING_STANDARD.md", "utf8");
for (const phrase of ["Every paid product is a direct paid download", "free Studio is optional", "Required Safety Boundaries"]) {
  if (!contractDoc.includes(phrase)) fail(`${TAG} offering standard missing ${phrase}`);
}
const generator = fs.readFileSync("scripts/generate_consumer_downloads.py", "utf8");
for (const phrase of ["DISCLAIMER_TITLE = 'Important: Read This First'", "flow.extend(bullets(DISCLAIMER))", "add_docx_disclaimer(doc, product)"]) {
  if (!generator.includes(phrase)) fail(`${TAG} generator missing PDF/DOCX disclaimer source token: ${phrase}`);
}

// --- the kit files ----------------------------------------------------------
if (kitsMode("download-first-page-boundary") === "contract") {
  console.log(`${TAG} OK contract products=${skus.length} contracts=${registry.contracts.length}; ${CI_NOTE}`);
  process.exit(0);
}
const problems = firstPageProblems(kitsDir(), skus);
if (problems.length) fail(`${TAG} ${problems.length} problem(s):\n  ${problems.slice(0, 40).join("\n  ")}`);
console.log(`${TAG} OK products=${skus.length} files=${skus.length * 2} dir=${kitsDir()}`);
