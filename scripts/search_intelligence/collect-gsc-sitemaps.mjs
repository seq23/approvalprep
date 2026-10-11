#!/usr/bin/env node
// Record whether Search Console has the sitemap registered, and register it if not.
//
// A submit that returns OK says nothing about what the property holds, so this
// asks: sitemaps.list before, sitemaps.submit only when the sitemap is absent,
// sitemaps.list after. Both list responses go to
// data/search_intelligence/gsc_sitemaps.json, which validate:index-coverage reads.
//
// No credential: NAMED_STOP (exit 0), written only when no earlier record exists.
// 401/403: NAMED_STOP with the owner step. Submitted and still not listed: exit 1.
import { env, readJson, writeJson, now, gscAccessToken } from "../intelligence/_lib.mjs";

export const OUT = "data/search_intelligence/gsc_sitemaps.json";
const siteUrl = env("GSC_SITE_URL") || env("GOOGLE_SEARCH_CONSOLE_SITE_URL") || "sc-domain:approvalprep.com";
export const SITEMAP_URL = "https://approvalprep.com/sitemap.xml";
const api = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`;
const listed = (resp) => (resp?.sitemap || []).some((s) => s.path === SITEMAP_URL);

async function call(token, url, method = "GET") {
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) { const e = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`); e.status = res.status; throw e; }
  return text ? JSON.parse(text) : {};
}

async function main() {
  const base = { schema_version: "1.0", collected_at: now(), site: siteUrl, sitemap_url: SITEMAP_URL };
  const token = await gscAccessToken("https://www.googleapis.com/auth/webmasters");
  if (!token) {
    const stop = "NAMED STOP gsc-sitemaps: GSC_SERVICE_ACCOUNT_JSON is not set in this environment; the daily cycle supplies it from repository secrets.";
    console.log(stop);
    if (!readJson(OUT, null)) writeJson(OUT, { ...base, state: "NAMED_STOP", named_stop: stop });
    return 0;
  }
  let before, after, submitted = false;
  try {
    before = await call(token, api);
    if (!listed(before)) { await call(token, `${api}/${encodeURIComponent(SITEMAP_URL)}`, "PUT"); submitted = true; }
    after = await call(token, api);
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) throw error;
    const stop = `NAMED STOP gsc-sitemaps: Search Console refused sitemaps (${error.message.slice(0, 160)}). Owner step: Search Console > property ${siteUrl} > Settings > Users and permissions > give the gsc-bot service account Full permission.`;
    console.log(stop);
    writeJson(OUT, { ...base, state: "NAMED_STOP", named_stop: stop });
    return 0;
  }
  const state = listed(after) ? "REGISTERED" : "NOT_LISTED";
  const entry = (after.sitemap || []).find((s) => s.path === SITEMAP_URL) || {};
  writeJson(OUT, { ...base, state, named_stop: null, submitted_this_run: submitted, listed_before: listed(before), listed_after: listed(after), entry, list_before: before, list_after: after });
  console.log(`gsc-sitemaps ${state}: listed before=${listed(before)} submitted=${submitted} listed after=${listed(after)}; lastSubmitted=${entry.lastSubmitted} lastDownloaded=${entry.lastDownloaded} isPending=${entry.isPending} errors=${entry.errors} warnings=${entry.warnings}`);
  if (state !== "REGISTERED") { console.error(`gsc-sitemaps: ${SITEMAP_URL} submitted and still not listed on ${siteUrl}`); return 1; }
  return 0;
}

process.exit(await main());
