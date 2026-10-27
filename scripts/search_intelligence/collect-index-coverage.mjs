#!/usr/bin/env node
// Index coverage for every sitemap URL, from the Search Console URL Inspection API.
//
// Why (11 Oct 2026): Search Console showed 10 impressions and 0 clicks over 28
// days (11 Sep-8 Oct) across 99 sitemap URLs. Whether Google has indexed,
// crawled-but-dropped, or never seen the other pages was not measured: the
// existing connector (scripts/intelligence/ingest-gsc-url-inspection.mjs)
// inspects the first 25 manifest routes serially and never the sitemap.
// This step runs in the daily cycle (intelligence-ingest-free-sources.yml) and
// commits data/search_intelligence/index_coverage.json with counts by
// coverageState; validate:index-coverage checks it is fresh and consistent.
//
// Quota: at most DAILY_CAP inspections per UTC day (counted in the file's own
// quota ledger), 8 in parallel. If the sitemap ever exceeds the cap, the URLs
// with the oldest result go first and the rest carry their own inspected_at.
//
// Outcomes, never a silent zero:
//   - no credential: NAMED STOP (exit 0); an existing file is kept, with no
//     file one is written listing every sitemap URL as NOT_INSPECTED;
//   - 401/403: NAMED STOP naming the owner step (exit 0), inspected rows kept;
//   - nothing could be inspected for any other reason: exit 1.
import fs from "node:fs";
import { env, readJson, writeJson, now, gscAccessToken, inspectionBaseUrl } from "../intelligence/_lib.mjs";

export const OUT = "data/search_intelligence/index_coverage.json";
export const SITEMAP = "public/sitemap.xml";
export const WORKERS = 8;
export const DAILY_CAP = 150;
const siteUrl = env("GSC_SITE_URL") || env("GOOGLE_SEARCH_CONSOLE_SITE_URL") || "sc-domain:approvalprep.com";

export const BUCKETS = [
  ["indexed", /^(submitted and indexed|indexed, not submitted in sitemap|indexed)/i],
  ["crawled_not_indexed", /crawled - currently not indexed/i],
  ["discovered_not_indexed", /discovered - currently not indexed/i],
  ["unknown_to_google", /url is unknown to google/i]
];
export function bucketOf(state) {
  if (state === "NOT_INSPECTED") return "not_inspected";
  for (const [name, rx] of BUCKETS) if (rx.test(state || "")) return name;
  return "other";
}
export function sitemapUrls(file = SITEMAP) {
  return [...fs.readFileSync(file, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
export function summarize(rows) {
  const count = (fn) => rows.reduce((acc, r) => { const k = fn(r); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const sortObj = (o) => Object.fromEntries(Object.entries(o).sort());
  const buckets = count((r) => bucketOf(r.coverageState));
  return {
    by_coverage_state: sortObj(count((r) => r.coverageState || "UNKNOWN")),
    by_verdict: sortObj(count((r) => r.verdict || "NONE")),
    buckets: Object.fromEntries(["indexed", "crawled_not_indexed", "discovered_not_indexed", "unknown_to_google", "other", "not_inspected"].map((k) => [k, buckets[k] || 0]))
  };
}
const notInspected = (url, why) => ({ url, verdict: null, coverageState: "NOT_INSPECTED", lastCrawlTime: null, indexingState: null, inspected_at: null, not_inspected_reason: why });

function write(urls, byUrl, state, namedStop, inspectedThisRun, quotaLedger) {
  const rows = urls.map((u) => byUrl[u] || notInspected(u, namedStop || "not reached this run (daily cap)"));
  const doc = {
    schema_version: "1.0",
    truth_source: "google_search_console_url_inspection",
    site_url: siteUrl,
    collected_at: now(),
    state,
    named_stop: namedStop,
    sitemap_source: SITEMAP,
    sitemap_url_count: urls.length,
    inspected_this_run: inspectedThisRun,
    quota: { daily_cap: DAILY_CAP, workers: WORKERS, inspections_by_day: quotaLedger },
    summary: summarize(rows),
    truth_boundary: "URL Inspection reports Google's index state for each URL at inspected_at. It is not a ranking or traffic measure; impressions come from data/intelligence/gsc_search_analytics.json.",
    urls: rows
  };
  writeJson(OUT, doc);
  const b = doc.summary.buckets;
  console.log(`index-coverage ${state}: ${urls.length} sitemap URLs - indexed ${b.indexed}, crawled-not-indexed ${b.crawled_not_indexed}, discovered-not-indexed ${b.discovered_not_indexed}, unknown-to-google ${b.unknown_to_google}, other ${b.other}, not inspected ${b.not_inspected} (${inspectedThisRun} inspected this run)`);
}

// A release adds URLs to the sitemap between two daily inspection runs. Before
// 27 Oct 2026 every release that published a page then failed
// validate:index-coverage ("URL set differs from the sitemap: missing 2") with
// no repair registered, because only the daily cycle rewrote this file. The
// release now reconciles it: a new sitemap URL gets an honest NOT_INSPECTED row
// (the next daily cycle inspects it), a URL gone from the sitemap is dropped,
// every inspected row is kept as it was, and collected_at is NOT advanced, so
// the freshness check still measures the last real inspection run.
export const RECONCILE_REASON = "published after the last inspection run; the next daily cycle inspects it";
export function reconcileWithSitemap(doc, urls) {
  const byUrl = Object.fromEntries((doc?.urls || []).map((r) => [r.url, r]));
  const rows = urls.map((u) => byUrl[u] || notInspected(u, RECONCILE_REASON));
  return { ...doc, sitemap_url_count: urls.length, summary: summarize(rows), urls: rows };
}
function reconcileMain() {
  const urls = sitemapUrls();
  if (!urls.length) { console.error(`index-coverage reconcile: ${SITEMAP} lists 0 URLs; refusing to reconcile against nothing.`); return 1; }
  const previous = readJson(OUT, null);
  if (!previous) { console.error(`index-coverage reconcile: ${OUT} is missing; the daily cycle writes it first.`); return 1; }
  const next = reconcileWithSitemap(previous, urls);
  const added = next.urls.filter((r) => r.not_inspected_reason === RECONCILE_REASON && !(previous.urls || []).some((p) => p.url === r.url)).length;
  const dropped = (previous.urls || []).filter((r) => !urls.includes(r.url)).length;
  writeJson(OUT, next);
  console.log(`index-coverage reconcile: ${urls.length} sitemap URLs, ${added} added as NOT_INSPECTED, ${dropped} dropped, collected_at kept at ${next.collected_at}`);
  return 0;
}

async function main() {
  const urls = sitemapUrls();
  if (!urls.length) { console.error(`index-coverage: ${SITEMAP} lists 0 URLs; nothing to inspect is a failure.`); return 1; }
  const previous = readJson(OUT, null);
  const carried = Object.fromEntries((previous?.urls || []).filter((r) => r.inspected_at).map((r) => [r.url, r]));
  const today = new Date().toISOString().slice(0, 10);
  const ledger = Object.fromEntries(Object.entries(previous?.quota?.inspections_by_day || {}).filter(([d]) => d >= new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)));
  const token = await gscAccessToken();
  if (!token) {
    const stop = "NAMED STOP index-coverage: GSC_SERVICE_ACCOUNT_JSON is not set in this environment; the daily cycle supplies it from repository secrets.";
    console.log(stop);
    if (!previous) write(urls, {}, "NAMED_STOP", stop, 0, ledger);
    return 0;
  }
  const remaining = Math.max(0, DAILY_CAP - (ledger[today] || 0));
  const batch = [...urls].sort((a, b) => String(carried[a]?.inspected_at || "").localeCompare(String(carried[b]?.inspected_at || ""))).slice(0, remaining);
  const base = inspectionBaseUrl(siteUrl, env("APPROVALPREP_SITE_URL"));
  const byUrl = { ...carried };
  const errors = [];
  let held = null;
  let calls = 0;
  const queue = [...batch];
  async function worker() {
    while (queue.length && !held) {
      const raw = queue.shift();
      const inspectionUrl = raw.replace(/^https?:\/\/[^/]+/, base);
      calls += 1;
      let res, json;
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: "en-US" })
        }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
        if (res.ok || ![0, 429, 500, 502, 503].includes(res.status)) break;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      const text = await res.text();
      try { json = JSON.parse(text); } catch { json = null; }
      if (res.status === 401 || res.status === 403) { held = { status: res.status, detail: text.slice(0, 200), url: raw }; return; }
      if (res.status === 429 && /quota/i.test(text)) { held = { status: 429, detail: text.slice(0, 200), url: raw, quota: true }; return; }
      if (!res.ok || !json) { errors.push(`${raw}: HTTP ${res.status} ${text.slice(0, 120)}`); continue; }
      const r = json.inspectionResult?.indexStatusResult || {};
      byUrl[raw] = {
        url: raw,
        verdict: r.verdict || null,
        coverageState: r.coverageState || "UNKNOWN",
        lastCrawlTime: r.lastCrawlTime || null,
        indexingState: r.indexingState || null,
        robotsTxtState: r.robotsTxtState || null,
        pageFetchState: r.pageFetchState || null,
        googleCanonical: r.googleCanonical || null,
        userCanonical: r.userCanonical || null,
        inspected_at: now()
      };
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  ledger[today] = (ledger[today] || 0) + calls;
  const inspected = batch.filter((u) => byUrl[u]?.inspected_at && byUrl[u] !== carried[u]).length;
  if (held) {
    const stop = held.quota
      ? `NAMED STOP index-coverage: URL Inspection quota exhausted (${held.detail}); it resets daily. ${inspected} URL(s) inspected this run are kept.`
      : `NAMED STOP index-coverage: Search Console refused URL Inspection (HTTP ${held.status}: ${held.detail}). Owner step: Search Console > property ${siteUrl} > Settings > Users and permissions > give the gsc-bot service account Owner or Full permission.`;
    console.log(stop);
    write(urls, byUrl, "NAMED_STOP", stop, inspected, ledger);
    return 0;
  }
  if (batch.length && inspected === 0) { console.error(`index-coverage: nothing inspected; first errors: ${errors.slice(0, 3).join(" | ")}`); return 1; }
  if (errors.length) console.log(`::warning title=URL inspection partial::${errors.length} URL(s) failed: ${errors.slice(0, 3).join(" | ")}`);
  write(urls, byUrl, errors.length ? "PARTIAL" : "OK", null, inspected, ledger);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(process.argv.includes("--reconcile") ? reconcileMain() : await main());
