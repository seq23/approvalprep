#!/usr/bin/env node
// Weekly Pinterest measurement: visits per pin variant, from the analytics this
// repo already records. Every page view posts to /api/track-event, which stores
// path + query (utm params included) in D1 conversion_events (functions/api/
// track-event.js, src/components/AnalyticsEvent.astro). This reads the last 7
// days of page_view rows whose query carries utm_source=pinterest and counts them
// per utm_content (= the variant id; launch pins carry no utm_content).
//
// Writes data/pinterest/metrics.json (newest week first, 26 kept). When D1 cannot
// be read (no Cloudflare credentials in this environment, API refusal) or the
// tracker recorded no page views at all in the window (so a zero would be a lie),
// it writes NO numbers: state NAMED_STOP, stop PINTEREST_METRICS_UNAVAILABLE, the
// reason, and prints the stop so the run summary shows it. Run weekly by
// .github/workflows/pinterest-metrics.yml.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OUT = "data/pinterest/metrics.json";
const STOP = "PINTEREST_METRICS_UNAVAILABLE";
const DB = "approvalprep-products";
const now = process.env.PINFEED_NOW ? new Date(process.env.PINFEED_NOW) : new Date();
const since = new Date(now.getTime() - 7 * 86400000).toISOString();
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { weeks: [] };

function save(doc) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
}
function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}
function namedStop(reason) {
  save({ ...prev, updatedAt: now.toISOString(), state: "NAMED_STOP", stop: STOP, reason, source: "d1:conversion_events" });
  console.log(`NAMED STOP [${STOP}]: ${reason}`);
  summary(`### NAMED STOP \`${STOP}\`\n\n${reason}\n\nNo numbers were written. Clears itself on the first run that can read D1.`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=${STOP}::${reason}`);
  process.exit(0);
}
function d1(sql) {
  const r = spawnSync("npx", ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql], { encoding: "utf8", env: process.env, timeout: 120000 });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "wrangler failed").split("\n").filter(Boolean).slice(-3).join(" | ").slice(0, 300));
  const parsed = JSON.parse(r.stdout);
  return (Array.isArray(parsed) ? parsed[0] : parsed).results || [];
}

if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
  namedStop("CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID are not set here, so D1 conversion_events (the page-view log with utm params) cannot be read. Add both as repository secrets (a token with D1 read on the approvalprep account).");
}

let totalViews, rows;
try {
  totalViews = Number(d1(`SELECT COUNT(*) AS n FROM conversion_events WHERE event = 'page_view' AND created_at >= '${since}'`)[0]?.n ?? 0);
  rows = d1(`SELECT path, COUNT(*) AS views, COUNT(DISTINCT session_id_hash) AS sessions FROM conversion_events WHERE event = 'page_view' AND created_at >= '${since}' AND path LIKE '%utm_source=pinterest%' GROUP BY path`);
} catch (e) {
  namedStop(`D1 read failed: ${e.message}`);
}
if (!totalViews) namedStop(`D1 conversion_events holds no page_view rows since ${since}: the tracker is not recording, so a Pinterest count of 0 would not be a measurement.`);

const byVariant = {};
const byPage = {};
let total = 0;
for (const r of rows) {
  const u = new URL(r.path, "https://approvalprep.com");
  const id = u.searchParams.get("utm_content") || `launch:${u.pathname}`;
  const v = (byVariant[id] ||= { views: 0, sessions: 0, page: u.pathname });
  v.views += Number(r.views); v.sessions += Number(r.sessions);
  byPage[u.pathname] = (byPage[u.pathname] || 0) + Number(r.views);
  total += Number(r.views);
}
const week = { weekEnding: now.toISOString().slice(0, 10), since, allPageViews: totalViews, pinterestViews: total, byVariant, byPage };
const weeks = [week, ...(prev.weeks || []).filter((w) => w.weekEnding !== week.weekEnding)].slice(0, 26);
save({ _comment: "Weekly Pinterest visits per pin variant from D1 conversion_events (page_view rows with utm_source=pinterest). Written by scripts/pinterest/measure.mjs.", updatedAt: now.toISOString(), state: "MEASURED", source: "d1:conversion_events", weeks });
const top = Object.entries(byVariant).sort((a, b) => b[1].views - a[1].views).slice(0, 5).map(([id, v]) => `${id} ${v.views}`).join(", ");
console.log(`[pinterest-metrics] MEASURED ${total} Pinterest page views of ${totalViews} total since ${since}; top: ${top || "none"}`);
summary(`### Pinterest week ending ${week.weekEnding}\n\n${total} Pinterest page views (${totalViews} total). Top: ${top || "none"}`);
