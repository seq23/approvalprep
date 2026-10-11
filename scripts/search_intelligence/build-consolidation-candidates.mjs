#!/usr/bin/env node
// Consolidation candidates: sitemap pages with 0 Search Console impressions and
// thin content, each named with the hub it would fold into.
//
// LEDGER ONLY. Nothing here redirects, noindexes or deletes; it is the decision
// input for folding thin pages into their hubs once index_coverage.json has a
// week of data. "Thin" is measured on the built page: words of visible text
// inside <main> below THIN_WORDS. Impressions come from the rolling 28-day
// Search Console collection. Pages whose role is root, hub or utility are never
// candidates. A thin page with no known hub is listed under thin_without_hub
// with the reason, never silently skipped.
import fs from "node:fs";
import { readJson, writeJson } from "../intelligence/_lib.mjs";
import { sitemapUrls } from "./collect-index-coverage.mjs";

export const OUT = "data/search_intelligence/consolidation_candidates.json";
export const THIN_WORDS = 600;
const UTILITY = new Set(["/contact", "/about", "/methodology", "/glossary", "/editorial-policy", "/ai-use-policy", "/resources", "/blog", "/tools", "/templates", "/reports", "/pricing", "/not-a-credit-repair-company", "/letter-writing-studio"]);
// Explicit hubs for page families whose parent is not their URL parent.
const HUB_FOR = {
  "/templates/letters/address-history-explanation": "/letter-of-explanation/address-history",
  "/templates/letters/bank-statement-deposit-explanation": "/letter-of-explanation/bank-statement-deposits",
  "/templates/letters/employment-gap-explanation": "/letter-of-explanation/employment-gap",
  "/templates/income/self-employed-proof-of-income": "/proof-of-income/self-employed",
  "/templates/rental/rental-application-cover-letter": "/rental-application/cover-letter",
  "/reports/apartment-application-prep-report": "/how-to-get-approved-for-an-apartment",
  "/reports/small-business-funding-document-prep-report": "/business-loan-documents",
  "/reports/document-readiness-index": "/important-documents-checklist"
};
const pathOf = (u) => { const p = new URL(u).pathname.replace(/\/+$/, ""); return p || "/"; };

export function wordsOnBuiltPage(path) {
  const file = `dist${path === "/" ? "" : path}/index.html`;
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, "utf8");
  const main = (html.match(/<main[^>]*>([\s\S]*)<\/main>/) || [null, html])[1]
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  return main.split(/\s+/).filter(Boolean).length;
}

export function build() {
  const urls = sitemapUrls();
  const paths = urls.map(pathOf);
  const inSitemap = new Set(paths);
  const gsc = readJson("data/intelligence/gsc_search_analytics.json", { rows: [] });
  const impressions = {};
  for (const r of gsc.rows || []) { if (!r.page) continue; const p = pathOf(r.page); impressions[p] = (impressions[p] || 0) + (Number(r.impressions) || 0); }
  const coverage = Object.fromEntries((readJson("data/search_intelligence/index_coverage.json", { urls: [] }).urls || []).map((r) => [pathOf(r.url), r.coverageState]));
  const answers = readJson("data/content/generated_answers.json", { answers: [] }).answers || [];
  const answerHub = Object.fromEntries(answers.map((a) => [`/blog/${a.slug}`, a.route]));
  const hubFor = (p) => HUB_FOR[p] || answerHub[p] || null;
  const hubs = new Set(paths.map(hubFor).filter(Boolean));
  const roles = {};
  const candidates = [];
  const thinWithoutHub = [];
  for (const p of paths) {
    const role = p === "/" ? "root" : UTILITY.has(p) ? "utility" : hubs.has(p) ? "hub" : "page";
    roles[role] = (roles[role] || 0) + 1;
    if (role !== "page") continue;
    const words = wordsOnBuiltPage(p);
    if (words === null) throw new Error(`consolidation: dist has no built page for ${p}; run npm run build first`);
    const imp = impressions[p] || 0;
    if (imp > 0 || words >= THIN_WORDS) continue;
    const hub = hubFor(p);
    const row = { path: p, words, impressions_28d: imp, coverage_state: coverage[p] || "NOT_INSPECTED" };
    if (hub && inSitemap.has(hub)) candidates.push({ ...row, fold_into_hub: hub });
    else thinWithoutHub.push({ ...row, reason: hub ? `named hub ${hub} is not in the sitemap` : "no hub mapped for this page family" });
  }
  const byHub = candidates.reduce((acc, c) => { acc[c.fold_into_hub] = (acc[c.fold_into_hub] || 0) + 1; return acc; }, {});
  return {
    schema_version: "1.0",
    status: "LEDGER_ONLY_NO_REDIRECTS",
    rule: `A sitemap page is a candidate when it has 0 impressions in the 28-day Search Console window and fewer than ${THIN_WORDS} words of visible text in <main> on the built page; root, hub and utility pages never are.`,
    decision_input_for: "Folding thin pages into their hub once index_coverage.json holds 7 days of data. No redirect ships from this file.",
    gsc_window: gsc.window ? `${gsc.window.startDate}..${gsc.window.endDate}` : "rolling 28 days",
    thin_words_threshold: THIN_WORDS,
    url_count: paths.length,
    roles,
    candidate_count: candidates.length,
    candidates_by_hub: Object.fromEntries(Object.entries(byHub).sort((a, b) => b[1] - a[1])),
    candidates,
    thin_without_hub: thinWithoutHub
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = build();
  writeJson(OUT, doc);
  console.log(`consolidation-candidates: ${doc.candidate_count} candidates across ${Object.keys(doc.candidates_by_hub).length} hubs; ${doc.thin_without_hub.length} thin without a hub; roles ${JSON.stringify(doc.roles)}`);
}
