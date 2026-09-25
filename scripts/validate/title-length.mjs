#!/usr/bin/env node
// Every built page's <title> must be non-empty and at most 70 characters, and
// no two indexable pages may share one.
//
// Bing Webmaster Site Scan (25 Sep 2026) flagged "Title too long" on 20
// approvalprep.com pages: blog answers ("<question> - ApprovalPrep Blog") and
// the reports ("<report title> - ApprovalPrep") ran past 70 characters. The fix
// lives in src/lib/title.ts (fitTitle, applied in BaseLayout). This asserts the
// shipped HTML, so any page that bypasses the layout or any new title shape that
// slips past fitTitle is caught before deploy.
//
// It reads the published tree through requireBuildOutput, so it refuses to pass
// with no build, and it hard-fails if it finds zero pages.
import fs from "node:fs";
import path from "node:path";
import { root, walk, fail, requireBuildOutput } from "./_common.mjs";

const NAME = "title-length";
const MAX = 70;
const outDir = requireBuildOutput(NAME);
const pages = walk(outDir).filter((file) => file.endsWith(".html"));
if (pages.length === 0) fail(`[${NAME}] FAIL: found zero .html pages in ${outDir}; nothing was checked`);

const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const failures = [];
const seen = new Map();
let checked = 0;
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match) continue; // redirect stubs and fragments carry no document title
  checked++;
  const title = decode(match[1]);
  if (!title) failures.push(`${rel}: empty <title>`);
  else if (title.length > MAX) failures.push(`${rel}: <title> is ${title.length} characters (max ${MAX}): "${title}"`);
  const noindex = /<meta\s+name=["']robots["'][^>]*noindex/i.test(html);
  if (title && !noindex) {
    if (seen.has(title)) failures.push(`${rel}: duplicate <title> "${title}" (also ${seen.get(title)})`);
    else seen.set(title, rel);
  }
}

if (checked === 0) fail(`[${NAME}] FAIL: ${pages.length} pages but zero carried a <title>; nothing was checked`);
if (failures.length) {
  console.error(`[${NAME}] FAIL: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[${NAME}] OK pages=${checked} max=${MAX} uniqueIndexable=${seen.size}`);
