#!/usr/bin/env node
import fs from "node:fs";
import zlib from "node:zlib";
import { fail, readJson, exists } from "./_common.mjs";

const catalog = readJson("data/products/full_offering_catalog.json");

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function extractDocxText(file) {
  const data = fs.readFileSync(file);
  const eocd = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) fail(`[download-offering-coverage] invalid docx zip: ${file}`);
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
  fail(`[download-offering-coverage] missing word/document.xml in ${file}`);
}

function pdfPageCount(file) {
  const raw = fs.readFileSync(file, "latin1");
  return (raw.match(/\/Type\s*\/Page\b/g) || []).length;
}

for (const category of catalog.categories) {
  const pdf = `seed-downloads/${category.product_sku}.pdf`;
  const docx = `seed-downloads/${category.product_sku}.docx`;
  if (!exists(pdf) || !exists(docx)) fail(`[download-offering-coverage] missing bundled files for ${category.product_sku}`);
  if (fs.statSync(pdf).size < 5000 || pdfPageCount(pdf) < 2) fail(`[download-offering-coverage] ${pdf} does not look like a complete PDF kit`);
  const docxText = normalize(extractDocxText(docx));
  for (const offering of category.offerings) {
    const name = normalize(offering.name);
    if (!docxText.includes(name)) fail(`[download-offering-coverage] ${docx} missing offering "${offering.name}"`);
  }
}
const generator = fs.readFileSync("scripts/generate_consumer_downloads.py", "utf8");
for (const token of ["for item in product.get('included_offerings', [])", "flow.append(P(item.title(), 'H2x'))", "doc.add_heading(item.title(), level=2)"]) {
  if (!generator.includes(token)) fail(`[download-offering-coverage] generator missing bundled offering token: ${token}`);
}

console.log(`[download-offering-coverage] OK products=${catalog.categories.length} offerings=${catalog.categories.flatMap((item) => item.offerings).length}`);
