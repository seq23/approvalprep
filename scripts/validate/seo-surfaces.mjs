#!/usr/bin/env node
import fs from "node:fs";
import { exists, fail, readJson } from "./_common.mjs";

const required = [
  "public/robots.txt",
  "public/_redirects",
  "public/indexnow-key.txt",
  "public/sitemap.xml",
  "src/pages/llms.txt.ts",
  "src/pages/llms-full.txt.ts",
  "src/pages/answers/index.json.ts",
  "scripts/seo/generate-sitemap.mjs",
  "scripts/seo/submit-indexnow.mjs",
  "scripts/seo/submit-bing.mjs",
  "scripts/seo/gsc-submit-or-log.mjs",
  "data/seo/submission_registry.json",
  "data/seo/indexing_receipts.json",
  "data/atoms/answer_atoms.json",
  "data/atlas/query_universe.json",
  "data/atlas/fanout_query_map.json"
];
const missing = required.filter((file) => !exists(file));
if (missing.length) fail("[seo] missing " + missing.join(", "));

const manifest = readJson("data/routes/route_manifest.json");
const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
const robots = fs.readFileSync("public/robots.txt", "utf8");
for (const route of manifest.routes.filter((item) => item.index)) {
  // The exact form the server answers 200 for. The slash-less form was a
  // substring of the correct entry, so this assertion passed either way and
  // could not have caught the redirect defect it looks like it covers.
  const loc = `https://approvalprep.com${route.path.replace(/\/+$/, "")}/`;
  if (!sitemap.includes(`<loc>${loc}</loc>`)) fail(`[seo] sitemap missing ${loc}`);
}
// _headers only reaches Cloudflare if it is inside the published output
// directory. It lived at the repo root for six days and was never copied into
// dist/, so the /_astro/* immutable rule added on 2026-08-26 had never applied:
// the live origin was returning Pages' 4-hour default on content-hashed assets
// that can never change. Assert the shipped artefact, not the source file.
const headersPath = "dist/_headers";
if (!exists(headersPath)) {
  fail(`[seo] ${headersPath} is missing, so Cloudflare Pages never receives the header rules; _headers must live in public/ to be published`);
} else {
  const headers = fs.readFileSync(headersPath, "utf8");
  if (!/^\/_astro\/\*$/m.test(headers)) fail("[seo] dist/_headers has lost its /_astro/* rule");
  if (!/max-age=31536000,\s*immutable/i.test(headers)) fail("[seo] dist/_headers no longer marks content-hashed assets immutable");
}

for (const token of ["Sitemap: https://approvalprep.com/sitemap.xml", "Disallow: /admin", "Disallow: /download"]) {
  if (!robots.includes(token)) fail(`[seo] robots missing ${token}`);
}

const atoms = readJson("data/atoms/answer_atoms.json").atoms || [];
const queries = readJson("data/atlas/query_universe.json").queries || [];
const answers = readJson("data/content/generated_answers.json").answers || [];
if (atoms.length < 150) fail("[seo] atom corpus too small for AEO/GEO foundation");
if (queries.length < 200) fail("[seo] query universe too small for AEO/GEO foundation");
if (answers.length < 30) fail("[seo] generated answer assets too small");

const registry = readJson("data/seo/submission_registry.json");
const receipts = readJson("data/seo/indexing_receipts.json");
const providerNames = new Set((registry.submissions || []).map((item) => item.provider));
for (const provider of ["IndexNow", "Bing Webmaster", "Google Search Console"]) {
  if (!providerNames.has(provider)) fail(`[seo] missing provider submission receipt: ${provider}`);
}
for (const receipt of [...(registry.submissions || []), ...(receipts.receipts || [])]) {
  if (receipt.rankingProof !== false || receipt.claimsIndexed !== false) fail("[seo] provider receipt must not claim ranking/indexing proof");
}

console.log(`[seo] OK indexedRoutes=${manifest.routes.filter((item) => item.index).length} atoms=${atoms.length} queries=${queries.length} answers=${answers.length}`);
