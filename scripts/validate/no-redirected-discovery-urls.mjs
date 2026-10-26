#!/usr/bin/env node
// Fails if the sitemap or the Pinterest queue/feed names a URL that 301s.
//
// Consolidation brief 3 (25 Oct 2026) folded 27 thin pages into their hubs and
// 301'd the old URLs. A sitemap entry or a pin that still names one of those
// sources hands Google and Pinterest a redirect instead of the page that holds
// the content: the sitemap reports "Page with redirect" and the pin spends its
// click on a hop. data/routes/redirects.json is the one list of sources, so this
// reads it rather than keeping its own.
import fs from "node:fs";

const fail = (msg) => { console.error(`[no-redirected-discovery-urls] FAIL ${msg}`); process.exit(1); };
const norm = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let pathname;
  try { pathname = new URL(raw, "https://approvalprep.com").pathname; } catch { return ""; }
  return pathname.replace(/\/+$/, "") || "/";
};
const sameSite = (value) => /^\//.test(String(value)) || /^https?:\/\/(www\.)?approvalprep\.com(\/|$)/.test(String(value));

const redirects = JSON.parse(fs.readFileSync("data/routes/redirects.json", "utf8")).redirects || [];
const sources = new Set(redirects.map((item) => norm(item.source)));
if (!sources.size) fail("data/routes/redirects.json has no sources; nothing to check against");

const problems = [];
let examined = 0;

const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!locs.length) fail("public/sitemap.xml lists 0 URLs");
for (const loc of locs) {
  examined++;
  if (sources.has(norm(loc))) problems.push(`public/sitemap.xml lists ${loc}, which 301s`);
}

// Every link-like field in the Pinterest queue and feed.
const LINK_KEYS = new Set(["path", "url", "link", "href", "destination", "targetUrl", "target_url"]);
let pinUrls = 0;
const walk = (node, file) => {
  if (Array.isArray(node)) { node.forEach((child) => walk(child, file)); return; }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string" && LINK_KEYS.has(key) && sameSite(value)) {
      examined++; pinUrls++;
      if (sources.has(norm(value))) problems.push(`${file} ${key}=${value} 301s; point the pin at its hub`);
    } else if (value && typeof value === "object") walk(value, file);
  }
};
for (const file of ["data/pinterest/queue.json", "data/pinterest/pinfeed.json"]) {
  if (!fs.existsSync(file)) fail(`${file} is missing`);
  walk(JSON.parse(fs.readFileSync(file, "utf8")), file);
}
if (!pinUrls) fail("examined 0 Pinterest URLs; the queue/feed shape changed and this check went inert");

if (problems.length) {
  console.error(`[no-redirected-discovery-urls] FAIL ${problems.length} redirecting URL(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`[no-redirected-discovery-urls] OK sitemapUrls=${locs.length} pinterestUrls=${pinUrls} redirectSources=${sources.size}`);
