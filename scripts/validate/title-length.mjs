#!/usr/bin/env node
// Every built page's <title> must be non-empty and at most 70 characters, and
// no two indexable pages may share one. Every indexable page's <title> must be
// at least 30 characters, and its meta description must exist, be 110-160
// characters, and be unique among indexable pages.
//
// Bing Webmaster Site Scan (25 Sep 2026) flagged "Title too long" on 20
// approvalprep.com pages: blog answers ("<question> - ApprovalPrep Blog") and
// the reports ("<report title> - ApprovalPrep") ran past 70 characters. The fix
// lives in src/lib/title.ts (fitTitle, applied in BaseLayout).
//
// A crawl of all 106 sitemap URLs the same day found the other side of the
// band: 11 titles under 30 characters ("Contact - ApprovalPrep"), 10 meta
// descriptions under 110, 64 over 160, and one description shared by 8 blog
// answers. Those are fixed where the text is authored (page frontmatter, the
// route copy in src/data/content.ts and data/content/*.json, the registries,
// and the generators in scripts/content/). This asserts the shipped HTML, so a
// page that bypasses the layout or a new generated shape is caught before
// deploy.
//
// It reads the published tree through requireBuildOutput, so it refuses to pass
// with no build, and it hard-fails if it finds zero pages or zero indexable
// pages.
import fs from "node:fs";
import path from "node:path";
import { root, walk, fail, requireBuildOutput } from "./_common.mjs";

const NAME = "title-length";
const TITLE_MIN = 30;
const TITLE_MAX = 70;
const DESCRIPTION_MIN = 110;
const DESCRIPTION_MAX = 160;
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

// Attribute order and quote style are not fixed by the layout, so read the
// <meta> tag whole and then its content attribute, honouring either quote.
const metaDescription = (html) => {
  const tag = html.match(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i);
  if (!tag) return null;
  const content = tag[0].match(/\bcontent=(?:"([^"]*)"|'([^']*)')/i);
  return content ? decode(content[1] ?? content[2]) : "";
};

const failures = [];
const seenTitles = new Map();
const seenDescriptions = new Map();
let checked = 0;
let indexable = 0;
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match) continue; // redirect stubs and fragments carry no document title
  checked++;
  const title = decode(match[1]);
  if (!title) failures.push(`${rel}: empty <title>`);
  else if (title.length > TITLE_MAX) failures.push(`${rel}: <title> is ${title.length} characters (max ${TITLE_MAX}): "${title}"`);
  const noindex = /<meta\s+name=["']robots["'][^>]*noindex/i.test(html);
  if (noindex) continue;
  indexable++;
  if (title && title.length < TITLE_MIN) failures.push(`${rel}: <title> is ${title.length} characters (min ${TITLE_MIN}): "${title}"`);
  if (title) {
    if (seenTitles.has(title)) failures.push(`${rel}: duplicate <title> "${title}" (also ${seenTitles.get(title)})`);
    else seenTitles.set(title, rel);
  }
  const description = metaDescription(html);
  if (description === null || description === "") {
    failures.push(`${rel}: missing meta description`);
    continue;
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    failures.push(`${rel}: meta description is ${description.length} characters (want ${DESCRIPTION_MIN}-${DESCRIPTION_MAX}): "${description}"`);
  }
  if (seenDescriptions.has(description)) failures.push(`${rel}: duplicate meta description (also ${seenDescriptions.get(description)}): "${description}"`);
  else seenDescriptions.set(description, rel);
}

if (checked === 0) fail(`[${NAME}] FAIL: ${pages.length} pages but zero carried a <title>; nothing was checked`);
if (indexable === 0) fail(`[${NAME}] FAIL: ${checked} titled pages but zero indexable; the description band was never checked`);
if (failures.length) {
  console.error(`[${NAME}] FAIL: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `[${NAME}] OK pages=${checked} indexable=${indexable} title=${TITLE_MIN}-${TITLE_MAX} ` +
    `description=${DESCRIPTION_MIN}-${DESCRIPTION_MAX} uniqueTitles=${seenTitles.size} uniqueDescriptions=${seenDescriptions.size}`
);
