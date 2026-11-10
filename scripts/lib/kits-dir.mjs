// Where the paid kit files live, and the checks every upload of them must pass.
//
// The 8 paid kits + the Complete Bundle (PDF + DOCX each) are the product
// buyers pay for. This repository is public, so the files are not in it: they
// live outside it in APPROVALPREP_KITS_DIR (default ~/.boss-os/approvalprep/kits).
// scripts/generate_consumer_downloads.py writes there, scripts/ops/r2-upload-assets.mjs
// and scripts/ops/deploy.mjs upload from there, and the validators below read there.
//
// Named stops:
//   [KITS_DIR_MISSING]       the kits directory is not there (never a silent skip)
//   [KIT_FIRST_PAGE_UNSAFE]  a kit about to be uploaded fails a safety check
//
// In CI the kits are absent by design. A validator there checks the public
// contract (manifest, registry, R2 keys) and prints CI_NOTE, so a green CI log
// says plainly that the file-level check did not run there and where it does run.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

export const KITS_DIR_ENV = "APPROVALPREP_KITS_DIR";
export const CI_NOTE = "kit files not in CI: first-page check runs at upload";

export function kitsDir() {
  return process.env[KITS_DIR_ENV] || path.join(os.homedir(), ".boss-os", "approvalprep", "kits");
}

export function kitsDirPresent(dir = kitsDir()) {
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

export function inCi() {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

export function kitPath(sku, ext, dir = kitsDir()) {
  return path.join(dir, `${sku}.${ext}`);
}

export function kitsDirMissingMessage(label, dir = kitsDir()) {
  return `[KITS_DIR_MISSING] ${label}: ${dir} is not there. Set ${KITS_DIR_ENV} to the folder holding the paid kit PDF/DOCX files.`;
}

// "files"    - the kits are here: check the real files.
// "contract" - CI without the kits: check the public contract only and print CI_NOTE.
// Anywhere else a missing directory is the named stop KITS_DIR_MISSING.
export function kitsMode(label) {
  if (kitsDirPresent()) return "files";
  if (inCi()) return "contract";
  console.error(kitsDirMissingMessage(label));
  process.exit(1);
}

// The kit files in a directory, as { file, sku, ext } rows.
export function listKitFiles(dir = kitsDir()) {
  return fs.readdirSync(dir)
    .filter((file) => /\.(pdf|docx)$/i.test(file))
    .sort()
    .map((file) => ({ file: path.join(dir, file), sku: file.replace(/\.(pdf|docx)$/i, ""), ext: file.split(".").pop().toLowerCase() }));
}

export function extractDocxText(file) {
  const data = fs.readFileSync(file);
  const eocd = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error(`invalid docx zip: ${file}`);
  const centralSize = data.readUInt32LE(eocd + 12);
  const centralOffset = data.readUInt32LE(eocd + 16);
  let offset = centralOffset;
  const end = centralOffset + centralSize;
  while (offset < end) {
    if (data.readUInt32LE(offset) !== 0x02014b50) break;
    const method = data.readUInt16LE(offset + 10);
    const compressedSize = data.readUInt32LE(offset + 20);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localHeaderOffset = data.readUInt32LE(offset + 42);
    const name = data.slice(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (name === "word/document.xml") {
      const localNameLength = data.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = data.readUInt16LE(localHeaderOffset + 28);
      const payloadStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const payload = data.slice(payloadStart, payloadStart + compressedSize);
      const xml = (method === 0 ? payload : zlib.inflateRawSync(payload)).toString("utf8");
      return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`missing word/document.xml in ${file}`);
}

export function pdfPageCount(file) {
  const raw = fs.readFileSync(file, "latin1");
  return (raw.match(/\/Type\s*\/Page\b/g) || []).length;
}

export function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// The self-service boundary every paid kit opens with (risk brain R-ADV-13:
// self-help templates only, not a credit repair company, no contact with
// bureaus or creditors, no fake documents, no promises).
export const FIRST_PAGE_PHRASES = [
  "Important: Read This First",
  "self-service paperwork tool",
  "not a law firm",
  "lender",
  "broker",
  "credit repair company",
  "does not contact",
  "does not create fake documents",
  "promise approval",
  "Use only true facts",
  "licensed professional"
];

// Every problem with the kit files in `dir` for the given SKUs. A file in the
// directory for a SKU nobody sells is a problem too: an upload sends every file
// it finds, so every file it finds must have been checked.
export function firstPageProblems(dir, skus) {
  const problems = [];
  const wanted = new Set(skus);
  for (const row of listKitFiles(dir)) {
    if (!wanted.has(row.sku)) problems.push(`${row.file}: not a kit in the download manifest`);
  }
  for (const sku of skus) {
    const pdf = kitPath(sku, "pdf", dir);
    const docx = kitPath(sku, "docx", dir);
    if (!fs.existsSync(pdf) || !fs.existsSync(docx)) { problems.push(`missing paid files for ${sku}`); continue; }
    if (fs.statSync(pdf).size < 5000 || pdfPageCount(pdf) < 2) problems.push(`${pdf} does not look like a complete PDF kit`);
    let text;
    try { text = normalize(extractDocxText(docx)); } catch (err) { problems.push(`${docx}: ${err.message}`); continue; }
    for (const phrase of FIRST_PAGE_PHRASES) {
      if (!text.includes(normalize(phrase))) problems.push(`${docx} first page/content missing required phrase: ${phrase}`);
    }
  }
  return problems;
}

// Every bundled offering a kit promises must be inside the DOCX the buyer gets.
export function offeringCoverageProblems(dir, categories) {
  const problems = [];
  for (const category of categories) {
    const docx = kitPath(category.product_sku, "docx", dir);
    if (!fs.existsSync(docx)) { problems.push(`missing bundled files for ${category.product_sku}`); continue; }
    let text;
    try { text = normalize(extractDocxText(docx)); } catch (err) { problems.push(`${docx}: ${err.message}`); continue; }
    for (const offering of category.offerings) {
      if (!text.includes(normalize(offering.name))) problems.push(`${docx} missing offering "${offering.name}"`);
    }
  }
  return problems;
}
