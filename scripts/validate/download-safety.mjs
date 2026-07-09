#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { root, readJson, fail } from "./_common.mjs";

const manifest = readJson("data/products/download_manifest.json");
const unsafePhrases = ["guarantee approval", "fake paystub", "fake employment", "we repair your credit"];
const requiredBoundaryPhrases = [
  "self-service",
  "not a law firm",
  "does not contact",
  "does not create fake documents",
  "does not guarantee approval"
];

function checkText(label, text) {
  const lower = text.toLowerCase();
  for (const phrase of unsafePhrases) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const context = lower.slice(Math.max(0, idx - 100), idx + phrase.length + 100);
      const negated = context.includes("does not") || context.includes("do not") || context.includes("blocked") || context.includes("no ") || context.includes("not ");
      if (!negated) fail(`[download-safety] unsafe phrase ${phrase} in ${label}`);
    }
  }
}

for (const item of manifest.products) {
  if (!Array.isArray(item.files) || item.files.length < 2) fail("[download-safety] product missing consumer files " + item.sku);
  for (const file of item.files) {
    if (!String(file).startsWith("/api/download-file")) fail("[download-safety] paid downloads must use protected API links for " + item.sku);
  }
  if (!Array.isArray(item.r2Keys) || item.r2Keys.length < 2) fail("[download-safety] product missing R2 keys " + item.sku);
  if (item.files.some((file) => String(file).endsWith(".md") || String(file).endsWith(".txt"))) {
    fail("[download-safety] public paid downloads may not expose markdown or txt files for " + item.sku);
  }
}
const publicDownloadsDir = path.join(root, "public/downloads");
if (fs.existsSync(publicDownloadsDir)) {
  const publicFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else publicFiles.push(full);
    }
  }
  walk(publicDownloadsDir);
  const protectedNames = new Set();
  for (const item of manifest.products) {
    for (const key of item.r2Keys || []) protectedNames.add(path.basename(key).toLowerCase());
  }
  for (const file of publicFiles) {
    const rel = path.relative(root, file);
    const base = path.basename(file).toLowerCase();
    if (protectedNames.has(base) || /\.(pdf|docx)$/i.test(base)) {
      fail(`[download-safety] public/downloads contains protected paid-looking asset ${rel}`);
    }
    const text = fs.readFileSync(file, "utf8");
    checkText(rel, text);
  }
}

const verify = fs.readFileSync(path.join(root, "functions/api/verify-download.js"), "utf8").toLowerCase();
if (verify.includes("-guide.md") || verify.includes("-worksheet.txt")) fail("[download-safety] verify-download exposes markdown/txt files");
checkText("verify-download.js", verify);

console.log("[download-safety] OK");
