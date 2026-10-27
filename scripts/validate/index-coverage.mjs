#!/usr/bin/env node
// validate:index-coverage - data/search_intelligence/index_coverage.json and
// gsc_sitemaps.json are fresh, consistent with the sitemap, and produced by the
// daily cycle. Hard-fails when:
//   1. either file is missing, or older than MAX_AGE_DAYS (the daily cycle writes both);
//   2. the URL set differs from public/sitemap.xml, or it is empty;
//   3. the stored summary differs from a recount of its own rows, or the counts
//      by coverageState do not add up to the sitemap count;
//   4. a NAMED_STOP carries no stop text, or the state is not OK/PARTIAL/NAMED_STOP;
//   5. the daily quota ledger records a day above the cap;
//   6. the sitemap record is NOT_LISTED, or REGISTERED without listed_after;
//   7. the daily cycle (intelligence-ingest-free-sources.yml) no longer runs both
//      collectors with the credential and commits data/search_intelligence.
import fs from "node:fs";
import { sitemapUrls, summarize, DAILY_CAP, OUT, reconcileWithSitemap, RECONCILE_REASON } from "../search_intelligence/collect-index-coverage.mjs";

const MAX_AGE_DAYS = 4;
const errors = [];
const fail = (m) => errors.push(m);
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
const ageDays = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;

const cov = read(OUT);
const urls = sitemapUrls();
if (!urls.length) fail("public/sitemap.xml lists 0 URLs");
if (!cov) fail(`${OUT} is missing; the daily cycle writes it`);
else {
  if (!["OK", "PARTIAL", "NAMED_STOP"].includes(cov.state)) fail(`index coverage state ${cov.state} is not OK, PARTIAL or NAMED_STOP`);
  if (cov.state === "NAMED_STOP" && !/^NAMED STOP/.test(String(cov.named_stop || ""))) fail("index coverage NAMED_STOP carries no named_stop text");
  if (!(ageDays(cov.collected_at) <= MAX_AGE_DAYS)) fail(`index coverage collected_at ${cov.collected_at} is older than ${MAX_AGE_DAYS} days`);
  const rows = cov.urls || [];
  const got = new Set(rows.map((r) => r.url));
  const want = new Set(urls);
  const missing = urls.filter((u) => !got.has(u));
  const extra = [...got].filter((u) => !want.has(u));
  if (missing.length || extra.length) fail(`index coverage URL set differs from the sitemap: missing ${missing.length} (${missing.slice(0, 3).join(", ")}), extra ${extra.length} (${extra.slice(0, 3).join(", ")})`);
  if (cov.sitemap_url_count !== urls.length || rows.length !== urls.length) fail(`index coverage counts ${cov.sitemap_url_count}/${rows.length} rows, sitemap has ${urls.length}`);
  const recount = summarize(rows);
  if (JSON.stringify(recount) !== JSON.stringify(cov.summary)) fail(`index coverage summary is not a recount of its rows: stored ${JSON.stringify(cov.summary?.buckets)} vs ${JSON.stringify(recount.buckets)}`);
  const total = Object.values(cov.summary?.by_coverage_state || {}).reduce((a, b) => a + b, 0);
  if (total !== urls.length) fail(`counts by coverageState add to ${total}, sitemap has ${urls.length}`);
  for (const r of rows) if (r.coverageState !== "NOT_INSPECTED" && !r.inspected_at) fail(`${r.url} has coverageState ${r.coverageState} with no inspected_at`);
  for (const [day, n] of Object.entries(cov.quota?.inspections_by_day || {})) if (n > DAILY_CAP) fail(`quota ledger records ${n} inspections on ${day}, cap is ${DAILY_CAP}`);
}

const sm = read("data/search_intelligence/gsc_sitemaps.json");
if (!sm) fail("data/search_intelligence/gsc_sitemaps.json is missing; the daily cycle writes it");
else {
  if (!["REGISTERED", "NAMED_STOP"].includes(sm.state)) fail(`sitemap record state ${sm.state}: the sitemap is not registered in Search Console`);
  if (sm.state === "REGISTERED" && sm.listed_after !== true) fail("sitemap record says REGISTERED but listed_after is not true");
  if (sm.state === "NAMED_STOP" && !/^NAMED STOP/.test(String(sm.named_stop || ""))) fail("sitemap NAMED_STOP carries no named_stop text");
  if (!(ageDays(sm.collected_at) <= MAX_AGE_DAYS)) fail(`sitemap record collected_at ${sm.collected_at} is older than ${MAX_AGE_DAYS} days`);
}

// 8. reconcile (run by content:release after seo:sitemap, and the registered
//    repair): a sitemap URL added between inspection runs gets a NOT_INSPECTED
//    row, a removed one is dropped, inspected rows and collected_at are kept.
{
  const inspected = { url: "https://x.test/a/", verdict: "PASS", coverageState: "Submitted and indexed", inspected_at: "2026-10-26T00:00:00Z" };
  const fixture = { collected_at: "2026-10-26T00:00:00Z", state: "OK", urls: [inspected, { url: "https://x.test/gone/", coverageState: "NOT_INSPECTED", inspected_at: null }] };
  const r = reconcileWithSitemap(fixture, ["https://x.test/a/", "https://x.test/new/"]);
  if (r.urls.length !== 2 || r.sitemap_url_count !== 2) fail("reconcileWithSitemap did not match the sitemap URL set");
  if (r.urls[0] !== inspected) fail("reconcileWithSitemap did not keep an inspected row as it was");
  if (r.urls[1].coverageState !== "NOT_INSPECTED" || r.urls[1].not_inspected_reason !== RECONCILE_REASON) fail("reconcileWithSitemap did not add a new sitemap URL as NOT_INSPECTED");
  if (r.urls.some((u) => u.url === "https://x.test/gone/")) fail("reconcileWithSitemap kept a URL gone from the sitemap");
  if (r.collected_at !== fixture.collected_at) fail("reconcileWithSitemap advanced collected_at: freshness would no longer measure the last inspection run");
  if (JSON.stringify(r.summary) !== JSON.stringify(summarize(r.urls))) fail("reconcileWithSitemap summary is not a recount of its rows");
}
const release = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts || {};
if (!/index-coverage:reconcile/.test(fs.readFileSync("scripts/content/run-scheduled-release.mjs", "utf8")) || !/--reconcile/.test(release["search-intelligence:index-coverage:reconcile"] || "")) fail("content:release no longer reconciles index coverage after the sitemap: every published page would fail this check");

const wf = fs.readFileSync(".github/workflows/intelligence-ingest-free-sources.yml", "utf8");
for (const needle of ["search-intelligence:index-coverage", "search-intelligence:sitemaps", "GSC_SERVICE_ACCOUNT_JSON", "git add data/intelligence data/search_intelligence"]) {
  if (!wf.includes(needle)) fail(`intelligence-ingest-free-sources.yml no longer contains "${needle}": nothing would refresh index coverage`);
}
if (!/^\s+- cron:/m.test(wf)) fail("intelligence-ingest-free-sources.yml has no schedule");

if (errors.length) { console.error(`[index-coverage] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
const b = cov.summary.buckets;
console.log(`[index-coverage] OK state=${cov.state} urls=${urls.length} indexed=${b.indexed} crawled_not_indexed=${b.crawled_not_indexed} unknown=${b.unknown_to_google} not_inspected=${b.not_inspected} sitemap=${sm.state}`);
