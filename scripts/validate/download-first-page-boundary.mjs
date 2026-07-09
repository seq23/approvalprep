#!/usr/bin/env node
import fs from "node:fs";
import zlib from "node:zlib";
import { fail, readJson, exists } from "./_common.mjs";

const manifest = readJson("data/products/download_manifest.json");
const requiredPhrases = [
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

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function extractDocxText(file) {
  const data = fs.readFileSync(file);
  const eocd = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) fail(`[download-first-page-boundary] invalid docx zip: ${file}`);
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
  fail(`[download-first-page-boundary] missing word/document.xml in ${file}`);
}

function pdfPageCount(file) {
  const raw = fs.readFileSync(file, "latin1");
  return (raw.match(/\/Type\s*\/Page\b/g) || []).length;
}

for (const product of manifest.products) {
  const pdf = `seed-downloads/${product.sku}.pdf`;
  const docx = `seed-downloads/${product.sku}.docx`;
  if (!exists(pdf) || !exists(docx)) fail(`[download-first-page-boundary] missing paid files for ${product.sku}`);
  if (fs.statSync(pdf).size < 5000 || pdfPageCount(pdf) < 2) fail(`[download-first-page-boundary] ${pdf} does not look like a complete PDF kit`);
  const normalized = normalize(extractDocxText(docx));
  for (const phrase of requiredPhrases) {
    if (!normalized.includes(normalize(phrase))) {
      fail(`[download-first-page-boundary] ${docx} first page/content missing required phrase: ${phrase}`);
    }
  }
}

const contract = fs.readFileSync("docs/offerings/OFFERING_STANDARD.md", "utf8");
for (const phrase of ["Every paid product is a direct paid download", "free Studio is optional", "Required Safety Boundaries"]) {
  if (!contract.includes(phrase)) fail(`[download-first-page-boundary] offering standard missing ${phrase}`);
}
const generator = fs.readFileSync("scripts/generate_consumer_downloads.py", "utf8");
for (const phrase of ["DISCLAIMER_TITLE = 'Important: Read This First'", "flow.extend(bullets(DISCLAIMER))", "add_docx_disclaimer(doc, product)"]) {
  if (!generator.includes(phrase)) fail(`[download-first-page-boundary] generator missing PDF/DOCX disclaimer source token: ${phrase}`);
}

console.log(`[download-first-page-boundary] OK products=${manifest.products.length} files=${manifest.products.length * 2}`);
