#!/usr/bin/env node
// Every built page must carry the site's one Organization, described well enough
// for an answer engine to attribute the page to it, and a WebPage node tying the
// page to the site. The homepage must also carry WebSite.
//
// The Search Readiness checklist ran against the live site on 25 Oct 2026 and
// found both missing (items c1 and c2):
//   - all thirteen sampled pages shipped an Organization with name and url only,
//     no logo and no sameAs, so nothing identified the entity beyond its own
//     domain;
//   - /contact/, /glossary/ and /reports/document-readiness-index/ shipped no
//     WebPage at all.
// scripts/validate/structured-data.mjs existed but asserted that certain tokens
// appear in certain .astro sources - it cannot see what a page actually ships,
// and it passed throughout. This reads the published HTML.
//
// The fix is in src/lib/schema.ts (organizationNode) and src/layouts/BaseLayout
// (which emits the Organization and, for any page that does not publish its own,
// the WebPage). This asserts the result on every built page, so a page that
// bypasses the layout, or a future edit that thins the Organization back out, is
// caught before deploy. Hard-fails on zero pages.
import fs from "node:fs";
import path from "node:path";
import { walk, fail, requireBuildOutput } from "./_common.mjs";

const NAME = "schema-entity-graph";
const REQUIRED_ORG_KEYS = ["name", "url", "logo", "sameAs"];
// schema.org subtypes of WebPage, plus WebPage itself. A page carrying any of
// them has said what kind of page it is; that is what the item asks for.
const WEB_PAGE_TYPES = /^(WebPage|AboutPage|ContactPage|FAQPage|CollectionPage|ItemPage|ProfilePage|SearchResultsPage|QAPage|CheckoutPage|MedicalWebPage|RealEstateListing)$/;
const ORG_TYPES = /^(Organization|LocalBusiness|Corporation|NewsMediaOrganization|ProfessionalService|OnlineBusiness)$/;

// 404.html is assembled by scripts/build_404.mjs from the homepage's shell, is
// noindex, and is in no sitemap: it is the server's error response, not a
// published surface an engine attributes an entity to. It is named here rather
// than skipped by a robots rule, so excluding anything else takes an edit.
const NOT_A_PUBLISHED_SURFACE = new Set(["404.html"]);

const outDir = requireBuildOutput(NAME);
const pages = walk(outDir)
  .filter((file) => file.endsWith(".html"))
  .filter((file) => !NOT_A_PUBLISHED_SURFACE.has(path.relative(outDir, file)));
if (pages.length === 0) fail(`[${NAME}] FAIL: found zero .html pages in ${outDir}; nothing was checked`);

const typesOf = (node) => [].concat(node?.["@type"] ?? []).map(String);

// Every JSON-LD node on the page, in document order, flattening @graph.
function nodesOf(html, rel, failures) {
  const nodes = [];
  for (const match of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch (error) {
      failures.push(`${rel}: a JSON-LD block does not parse (${String(error.message).slice(0, 80)})`);
      continue;
    }
    const collect = (value) => {
      if (Array.isArray(value)) return value.forEach(collect);
      if (value && typeof value === "object") {
        if (value["@graph"]) collect(value["@graph"]);
        if (value["@type"]) nodes.push(value);
      }
    };
    collect(parsed);
  }
  return nodes;
}

// Depth-first, in the order a reader meets them: the same walk the checklist does.
function deepNodes(nodes, pattern) {
  const out = [];
  const seen = new Set();
  const visit = (value) => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) return value.forEach(visit);
    if (typesOf(value).some((type) => pattern.test(type))) out.push(value);
    for (const child of Object.values(value)) if (child && typeof child === "object") visit(child);
  };
  visit(nodes);
  return out;
}

const failures = [];
let checked = 0;
let homepageSeen = false;

for (const file of pages) {
  const rel = path.relative(outDir, file);
  const html = fs.readFileSync(file, "utf8");
  // Pages whose own <meta robots> says noindex are still checked: they are
  // reachable, and an engine that follows a link to one still reads its graph.
  const nodes = nodesOf(html, rel, failures);
  checked += 1;

  const orgs = deepNodes(nodes, ORG_TYPES);
  if (!orgs.length) failures.push(`${rel}: no Organization node`);
  else {
    // The first Organization a reader meets is the one an engine attributes to,
    // so it is the one that must be complete.
    const missing = REQUIRED_ORG_KEYS.filter((key) => {
      const value = orgs[0][key];
      return !value || (Array.isArray(value) && value.length === 0);
    });
    if (missing.length) failures.push(`${rel}: first Organization lacks ${missing.join(", ")}`);
  }

  if (!deepNodes(nodes, WEB_PAGE_TYPES).length) failures.push(`${rel}: no WebPage node (or a subtype of one)`);

  if (rel === "index.html") {
    homepageSeen = true;
    if (!deepNodes(nodes, /^WebSite$/).length) failures.push(`${rel}: the homepage has no WebSite node`);
  }
}

if (!homepageSeen) fail(`[${NAME}] FAIL: no index.html in ${outDir}; the homepage checks did not run`);
if (failures.length) fail(`[${NAME}] FAIL: ${failures.length} page(s)\n` + failures.slice(0, 40).join("\n"));
console.log(`[${NAME}] OK pages=${checked} organization=name,url,logo,sameAs webpage=present website=homepage`);
