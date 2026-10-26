#!/usr/bin/env node
// What the edge actually serves, after a deploy.
//
// Everything else in this repository measures the tree the build produced.
// Cloudflare sits between that tree and a crawler, and it has been wrong on its
// own: a Worker 301'd robots.txt on a sibling site, and a redirect or a cached
// _headers rule can turn a 200 into a 308 without any commit. A build-time
// validator cannot see any of it.
//
// So this fetches the live site and asserts the things a crawler and an answer
// engine read first:
//   - the crawl files: robots.txt, sitemap.xml, llms.txt, the IndexNow key;
//   - the brand files: favicon.ico, the 32px and 512px icons, apple-touch-icon,
//     site.webmanifest, og.png;
//   - the homepage's JSON-LD: Organization (with logo and sameAs), WebPage,
//     WebSite - the entity graph scripts/validate/schema-entity-graph.mjs
//     asserts at build time, confirmed at the edge;
//   - the measured URLs: every page Search Console has recorded an impression
//     for (data/search_intelligence/gsc_truth.json) must answer 200 directly,
//     not through a redirect. Those are the URLs real traffic lands on.
//   - a sample of sitemap URLs, same rule.
//
// Rule 0: it refuses to pass having checked nothing. Zero checks, an unreadable
// sitemap, or zero measured URLs with a truth file present is a failure.
//
// Usage: node scripts/ops/post-deploy-live-check.mjs [--base https://host]
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const arg = (name) => { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1]; };
const BASE = (arg("--base") || process.env.POSTDEPLOY_BASE_URL || "https://approvalprep.com").replace(/\/+$/, "");
const SITEMAP_SAMPLE = Number(process.env.POSTDEPLOY_SITEMAP_SAMPLE || 12);
const UA = "ApprovalPrepPostDeployCheck/1.0 (+https://approvalprep.com)";
const TIMEOUT_MS = 20000;

const failures = [];
const notes = [];
let checks = 0;

async function fetchOnce(url, { method = "GET", redirect = "manual" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { method, redirect, headers: { "user-agent": UA }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// One retry on a network error or a 5xx: a single cold edge is not a defect.
async function get(url, options) {
  let last;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchOnce(url, options);
      if (response.status < 500) return response;
      last = new Error(`${response.status}`);
    } catch (error) {
      last = error;
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 3000));
  }
  throw last;
}

async function expect200(url, { what, contentType = null, minBytes = 0 } = {}) {
  checks += 1;
  let response;
  try {
    response = await get(url);
  } catch (error) {
    failures.push(`${what}: ${url} did not answer (${String(error.message).slice(0, 80)})`);
    return null;
  }
  if (response.status !== 200) {
    const to = response.headers.get("location");
    failures.push(`${what}: ${url} answered ${response.status}${to ? ` -> ${to}` : ""} (expected 200, no redirect)`);
    return null;
  }
  const body = await response.text();
  if (contentType) {
    const got = (response.headers.get("content-type") || "").toLowerCase();
    if (!got.includes(contentType)) failures.push(`${what}: ${url} is ${got || "(no content-type)"}, expected ${contentType}`);
  }
  if (minBytes && body.length < minBytes) failures.push(`${what}: ${url} returned ${body.length} bytes, expected at least ${minBytes}`);
  return body;
}

// --- crawl files -------------------------------------------------------------
const robots = await expect200(`${BASE}/robots.txt`, { what: "crawl file", contentType: "text/plain", minBytes: 20 });
if (robots) {
  if (/^\s*disallow:\s*\/\s*$/im.test(robots) && !/^\s*allow:/im.test(robots)) failures.push("crawl file: robots.txt disallows the whole site");
  if (!/sitemap:/i.test(robots)) failures.push("crawl file: robots.txt names no sitemap");
}
const sitemapXml = await expect200(`${BASE}/sitemap.xml`, { what: "crawl file", contentType: "xml", minBytes: 100 });
await expect200(`${BASE}/llms.txt`, { what: "crawl file", contentType: "text/plain", minBytes: 100 });

// The IndexNow key file is named for the key, and the key is in the repo.
const keyFile = fs.readdirSync(path.join(root, "public")).find((f) => /^[0-9a-f]{32,}\.txt$/.test(f));
if (!keyFile) failures.push("crawl file: no IndexNow key file in public/");
else {
  const expected = fs.readFileSync(path.join(root, "public", keyFile), "utf8").trim();
  const served = await expect200(`${BASE}/${keyFile}`, { what: "IndexNow key" });
  if (served !== null && served.trim() !== expected) failures.push(`IndexNow key: /${keyFile} does not serve the key the repo holds`);
}

// --- brand files -------------------------------------------------------------
for (const file of ["favicon.ico", "favicon-32x32.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "og.png", "site.webmanifest"]) {
  await expect200(`${BASE}/${file}`, { what: "brand file", minBytes: 100 });
}

// --- the homepage entity graph at the edge -----------------------------------
const home = await expect200(`${BASE}/`, { what: "homepage", contentType: "text/html", minBytes: 1000 });
if (home) {
  const nodes = [];
  for (const m of home.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const collect = (v) => {
        if (Array.isArray(v)) return v.forEach(collect);
        if (v && typeof v === "object") { if (v["@graph"]) collect(v["@graph"]); if (v["@type"]) nodes.push(v); }
      };
      collect(JSON.parse(m[1]));
    } catch (error) {
      failures.push(`homepage: a JSON-LD block does not parse at the edge (${String(error.message).slice(0, 60)})`);
    }
  }
  const typed = (re) => nodes.find((n) => [].concat(n["@type"] ?? []).some((t) => re.test(String(t))));
  const org = typed(/^Organization$/);
  if (!org) failures.push("homepage: no Organization in the served JSON-LD");
  else for (const key of ["name", "url", "logo", "sameAs"]) if (!org[key] || (Array.isArray(org[key]) && !org[key].length)) failures.push(`homepage: served Organization lacks ${key}`);
  if (!typed(/^WebSite$/)) failures.push("homepage: no WebSite in the served JSON-LD");
  if (!typed(/WebPage$|^(AboutPage|ContactPage|FAQPage|CollectionPage|ItemPage)$/)) failures.push("homepage: no WebPage in the served JSON-LD");
  notes.push(`homepage json-ld nodes=${nodes.length}`);
}

// --- the URLs search actually sends people to --------------------------------
const truthPath = "data/search_intelligence/gsc_truth.json";
if (fs.existsSync(path.join(root, truthPath))) {
  const truth = JSON.parse(fs.readFileSync(path.join(root, truthPath), "utf8"));
  const measured = [...new Set((truth.window_queries || []).flatMap((q) => q.pages || []).concat((truth.history || []).map((q) => q.page).filter(Boolean)))];
  if (!measured.length) failures.push(`${truthPath} exists but names no measured page; nothing was checked against real traffic`);
  for (const url of measured) await expect200(url, { what: "measured URL", contentType: "text/html" });
  notes.push(`measured urls=${measured.length}`);
} else {
  failures.push(`${truthPath} is missing; the measured URLs were not checked`);
}

// --- a sample of the sitemap --------------------------------------------------
if (sitemapXml) {
  const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) failures.push("sitemap.xml names zero URLs");
  const step = Math.max(1, Math.floor(urls.length / SITEMAP_SAMPLE));
  const sample = urls.filter((_, i) => i % step === 0).slice(0, SITEMAP_SAMPLE);
  for (const url of sample) await expect200(url, { what: "sitemap URL", contentType: "text/html" });
  notes.push(`sitemap urls=${urls.length} sampled=${sample.length}`);
}

if (checks === 0) {
  console.error("[post-deploy-live-check] FAIL: zero checks ran; refusing to pass having looked at nothing");
  process.exit(1);
}
if (failures.length) {
  console.error(`[post-deploy-live-check] FAIL on ${BASE}: ${failures.length} of ${checks} checks`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`[post-deploy-live-check] OK ${BASE}: ${checks} checks (${notes.join(", ")})`);
