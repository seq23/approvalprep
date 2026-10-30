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
//
// Extended 30 Oct 2026 (authority audit): the Organization must now BE the
// entity in src/data/entity.json - same @id, name, logo, description, the same
// sameAs set, and parentOrganization pointing at the one Spry Labs @id - and no
// sameAs anywhere may name this site's own host (a self-reference tells an
// engine nothing). entity.json itself is checked first: a sameAs that is empty,
// self-referential, or also listed as pending fails before any page is read.
import fs from "node:fs";
import path from "node:path";
import { walk, fail, requireBuildOutput } from "./_common.mjs";

const NAME = "schema-entity-graph";
const ENTITY_FILE = "src/data/entity.json";
const SPRY_LABS_ID = "https://billionairehighperformancecoach.com/spry-labs#organization";
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

// --- the entity file -------------------------------------------------------
const entity = JSON.parse(fs.readFileSync(path.join(process.cwd(), ENTITY_FILE), "utf8"));
const OWN_HOST = new URL(entity.url || "https://approvalprep.com/").hostname.replace(/^www\./, "");
const hostOf = (value) => { try { return new URL(String(value)).hostname.replace(/^www\./, ""); } catch { return null; } };
const entityProblems = [];
for (const key of ["@id", "name", "url", "logo", "description"]) if (!entity[key]) entityProblems.push(`${key} is empty`);
if (hostOf(entity["@id"]) !== OWN_HOST) entityProblems.push(`@id ${entity["@id"]} is not on ${OWN_HOST}`);
if (!Array.isArray(entity.sameAs) || entity.sameAs.length === 0) entityProblems.push("sameAs lists zero profiles; nothing outside the site identifies the entity");
for (const url of entity.sameAs || []) {
  if (!/^https:\/\//.test(url) || !hostOf(url)) entityProblems.push(`sameAs ${url} is not an https URL`);
  else if (hostOf(url) === OWN_HOST || hostOf(url).endsWith(`.${OWN_HOST}`)) entityProblems.push(`sameAs ${url} is on the site's own host`);
}
if (new Set(entity.sameAs || []).size !== (entity.sameAs || []).length) entityProblems.push("sameAs repeats a URL");
const pending = new Set((entity.profiles_pending || []).map((profile) => profile.url));
for (const url of entity.sameAs || []) if (pending.has(url)) entityProblems.push(`${url} is in both sameAs and profiles_pending`);
if (entity.parentOrganization?.["@id"] !== SPRY_LABS_ID) entityProblems.push(`parentOrganization @id is ${entity.parentOrganization?.["@id"]}, not the Spry Labs entity ${SPRY_LABS_ID}`);
if (entityProblems.length) fail(`[${NAME}] FAIL: ${ENTITY_FILE}\n` + entityProblems.join("\n"));
const sameSet = (a, b) => { const x = [].concat(a ?? []).map(String).sort(); const y = [].concat(b ?? []).map(String).sort(); return x.length === y.length && x.every((v, i) => v === y[i]); };

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
    const org = orgs[0];
    const logo = typeof org.logo === "object" ? org.logo?.url : org.logo;
    if (org["@id"] !== entity["@id"]) failures.push(`${rel}: first Organization @id ${org["@id"]} is not ${entity["@id"]}`);
    if (org.name !== entity.name) failures.push(`${rel}: Organization name "${org.name}" differs from ${ENTITY_FILE}`);
    if (logo !== entity.logo) failures.push(`${rel}: Organization logo ${logo} differs from ${ENTITY_FILE}`);
    if (org.description !== entity.description) failures.push(`${rel}: Organization description differs from ${ENTITY_FILE}`);
    if (!sameSet(org.sameAs, entity.sameAs)) failures.push(`${rel}: Organization sameAs ${JSON.stringify(org.sameAs)} differs from ${ENTITY_FILE}`);
    if (org.parentOrganization?.["@id"] !== SPRY_LABS_ID) failures.push(`${rel}: Organization parentOrganization is not the Spry Labs @id`);
  }
  // Every node that declares sameAs - the Organization, an author, anything -
  // must point off-site.
  for (const node of deepNodes(nodes, /./)) {
    for (const url of [].concat(node.sameAs ?? [])) {
      const host = hostOf(url);
      if (host && (host === OWN_HOST || host.endsWith(`.${OWN_HOST}`))) failures.push(`${rel}: a ${typesOf(node).join("/")} node lists its own host in sameAs (${url})`);
    }
  }
  for (const article of deepNodes(nodes, /^Article$/)) {
    if (article.author?.parentOrganization?.["@id"] !== SPRY_LABS_ID) failures.push(`${rel}: Article author's parentOrganization is not the Spry Labs @id`);
  }

  if (!deepNodes(nodes, WEB_PAGE_TYPES).length) failures.push(`${rel}: no WebPage node (or a subtype of one)`);

  if (rel === "index.html") {
    homepageSeen = true;
    if (!deepNodes(nodes, /^WebSite$/).length) failures.push(`${rel}: the homepage has no WebSite node`);
  }
}

if (!homepageSeen) fail(`[${NAME}] FAIL: no index.html in ${outDir}; the homepage checks did not run`);
if (failures.length) fail(`[${NAME}] FAIL: ${failures.length} page(s)\n` + failures.slice(0, 40).join("\n"));
console.log(`[${NAME}] OK pages=${checked} organization=${entity["@id"]} sameAs=${entity.sameAs.length} pending=${pending.size} parent=${SPRY_LABS_ID} webpage=present website=homepage`);
