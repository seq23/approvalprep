#!/usr/bin/env node
// validate:query-aligned-pages - the pages Search Console already shows are
// aligned to the query it shows them for, on the built page.
// For every data/content/priority_pages.json entry with a target_query, hard-fails when:
//   - the query is not a gsc_search_analytics target in target_query_set.json;
//   - the built <title> is not the entry's metaTitle, or the <h1> is not its h1;
//   - the title or H1 shares none of the query's content words;
//   - the definition paragraph is not on the page;
//   - a query_faq question is missing from the FAQPage JSON-LD;
//   - there is no checkout button for the matching kit (data-sku).
// Hard-fails on zero aligned entries.
import fs from "node:fs";
import { requireBuildOutput } from "./_common.mjs";

const dir = requireBuildOutput("query-aligned-pages");
const errors = [];
const fail = (m) => errors.push(m);
const pri = JSON.parse(fs.readFileSync("data/content/priority_pages.json", "utf8")).pages;
const targets = JSON.parse(fs.readFileSync("data/search_intelligence/target_query_set.json", "utf8")).targets || [];
const gscQueries = new Set(targets.filter((t) => t.source === "gsc_search_analytics").map((t) => t.query_normalized));
const decode = (s) => s.replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/<[^>]+>/g, "").trim();
const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 3));
const entries = Object.entries(pri).filter(([, e]) => e.target_query);
if (!entries.length) fail("no priority page carries a target_query: nothing is aligned");
for (const [path, e] of entries) {
  if (!gscQueries.has(e.target_query)) fail(`${path}: target_query "${e.target_query}" is not a measured Search Console target`);
  const file = `${dir}${path}/index.html`;
  if (!fs.existsSync(file)) { fail(`${path}: not built`); continue; }
  const html = fs.readFileSync(file, "utf8");
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
  const h1 = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "");
  if (title !== e.metaTitle) fail(`${path}: <title> "${title}" is not "${e.metaTitle}"`);
  if (h1 !== e.h1) fail(`${path}: <h1> "${h1}" is not "${e.h1}"`);
  const q = words(e.target_query);
  for (const [label, text] of [["title", title], ["h1", h1]]) if (![...words(text)].some((w) => q.has(w))) fail(`${path}: ${label} shares no word with "${e.target_query}"`);
  if (!html.includes('data-content-block="query-definition"') || !decode(html).includes(e.definition.slice(0, 80))) fail(`${path}: definition paragraph missing`);
  const faqNames = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
    try { const j = JSON.parse(m[1]); return (Array.isArray(j) ? j : [j]).flatMap((x) => (x["@graph"] || [x])).filter((x) => x["@type"] === "FAQPage").flatMap((x) => x.mainEntity.map((q) => q.name)); } catch { return []; }
  });
  for (const f of e.query_faq || []) if (!faqNames.includes(f.question)) fail(`${path}: FAQPage JSON-LD lacks "${f.question}"`);
  if (!(e.query_faq || []).length) fail(`${path}: no query_faq`);
  if (!html.includes(`data-sku="${e.sku}"`)) fail(`${path}: no checkout path to ${e.sku}`);
}
if (errors.length) { console.error(`[query-aligned-pages] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[query-aligned-pages] OK aligned=${entries.length} ${entries.map(([p, e]) => `${p}<-"${e.target_query}"`).join(" ")}`);
