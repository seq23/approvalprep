#!/usr/bin/env node
import fs from "node:fs";
import { env, fetchJson, writeJson, appendRun, statusOnly, now } from "./_lib.mjs";

const connectorId = "cloudflare_crawler_logs";
const outputFile = "data/intelligence/cloudflare_crawler_logs.json";
const importFile = env("CLOUDFLARE_CRAWLER_LOG_IMPORT_FILE");
const accountId = env("CLOUDFLARE_ACCOUNT_ID");
const zoneId = env("CLOUDFLARE_ZONE_ID");
const token = env("CLOUDFLARE_API_TOKEN");

const botMatchers = [
  ["Googlebot", /googlebot/i],
  ["Bingbot", /bingbot/i],
  ["GPTBot", /gptbot|chatgpt/i],
  ["ClaudeBot", /claudebot|anthropic/i],
  ["PerplexityBot", /perplexity/i],
  ["Applebot", /applebot/i],
  ["Common Crawl", /ccbot|common crawl/i],
  ["DuckDuckBot", /duckduckbot/i]
];
function botFor(userAgent="") { return botMatchers.find(([,rx]) => rx.test(userAgent))?.[0] || "Other"; }
function normalizeRows(raw) {
  const rows = Array.isArray(raw) ? raw : (raw.visits || raw.rows || raw.data || []);
  return rows.map((row) => {
    const userAgent = row.userAgent || row.ua || row.clientRequestUserAgent || "";
    const path = row.path || row.route || row.uri || row.clientRequestPath || "/";
    return { path, url: row.url || path, userAgent, bot: row.bot || botFor(userAgent), requests: Number(row.requests || row.count || 1), lastSeenAt: row.lastSeenAt || row.datetime || now(), source: row.source || "cloudflare" };
  }).filter((row) => row.path || row.url || row.userAgent);
}

if (importFile) {
  const visits = normalizeRows(JSON.parse(fs.readFileSync(importFile, "utf8")));
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "manual_import", fetchedAt: now(), visits, errors: [] });
  appendRun(connectorId, visits.length ? "COMPLETE" : "NO_DATA", { mode: "manual_import", recordsImported: visits.length });
  console.log(JSON.stringify({ connectorId, mode: "manual_import", status: visits.length ? "COMPLETE" : "NO_DATA", recordsImported: visits.length }, null, 2));
} else if (!accountId || !zoneId || !token) {
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "unavailable", fetchedAt: null, visits: [], errors: [{ code: "NOT_CONFIGURED", message: "Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID, and CLOUDFLARE_API_TOKEN, or provide CLOUDFLARE_CRAWLER_LOG_IMPORT_FILE." }] });
  statusOnly(connectorId, "NOT_CONFIGURED", "Cloudflare crawler ingestion requires Cloudflare credentials or a manual import file.");
} else {
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const query = `query($zoneTag: string, $since: Time) { viewer { zones(filter: { zoneTag: $zoneTag }) { httpRequestsAdaptiveGroups(limit: 1000, filter: { datetime_geq: $since }) { count dimensions { clientRequestPath clientRequestUserAgent datetime } } } } }`;
    const data = await fetchJson("https://api.cloudflare.com/client/v4/graphql", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables: { zoneTag: zoneId, since } }) });
    const groups = data?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
    const visits = normalizeRows(groups.map((group) => ({ path: group.dimensions?.clientRequestPath, userAgent: group.dimensions?.clientRequestUserAgent, requests: group.count, datetime: group.dimensions?.datetime })));
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "live", fetchedAt: now(), accountId, zoneId, visits, errors: [] });
    appendRun(connectorId, visits.length ? "COMPLETE" : "NO_DATA", { mode: "live", recordsImported: visits.length });
    console.log(JSON.stringify({ connectorId, mode: "live", status: visits.length ? "COMPLETE" : "NO_DATA", recordsImported: visits.length }, null, 2));
  } catch (error) {
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "failed", fetchedAt: now(), visits: [], errors: [{ code: "SOURCE_ERROR", message: error.message }] });
    appendRun(connectorId, "SOURCE_ERROR", { mode: "live", reason: error.message, recordsImported: 0 });
    throw error;
  }
}
