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
  const loc = `https://approvalprep.com${route.path === "/" ? "" : route.path}`;
  if (!sitemap.includes(loc)) fail(`[seo] sitemap missing ${loc}`);
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
