#!/usr/bin/env node
import fs from "node:fs";
import { env, fetchJson, writeJson, appendRun, statusOnly, now, checkBudget, gscAccessToken } from "./_lib.mjs";

const connectorId = "google_search_console_search_analytics";
// sc-domain:approvalprep.com is the verified Search Console property. It is the
// default rather than a required secret because this connector reported
// NOT_CONFIGURED for want of a site string it could always have derived.
const siteUrl = env("GSC_SITE_URL") || env("GOOGLE_SEARCH_CONSOLE_SITE_URL") || "sc-domain:approvalprep.com";

// This connector accepted only a pre-minted GSC_ACCESS_TOKEN, and the portfolio
// stopped issuing those - the one credential still in use is a service-account
// JSON. So the connector could not authenticate by any route available to it and
// wrote NOT_CONFIGURED on every run, which is why approvalprep carried no
// measured demand while its Search Console property held 90 days of data.
// scripts/cadence/publish_headroom.mjs already reads the same JSON; this brings
// the search-analytics path onto it.

const accessToken = await gscAccessToken();
const importFile = env("GSC_SEARCH_ANALYTICS_IMPORT_FILE");
const outputFile = "data/intelligence/gsc_search_analytics.json";

function normalizeRows(raw) {
  const rows = Array.isArray(raw) ? raw : (raw.rows || raw.data || []);
  return rows.map((row) => ({
    query: row.query || row.keys?.[0] || "",
    page: row.page || row.keys?.[1] || row.url || "",
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
    importedAt: now()
  })).filter((row) => row.query || row.page);
}

if (importFile) {
  const raw = JSON.parse(fs.readFileSync(importFile, "utf8"));
  const rows = normalizeRows(raw);
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "manual_import", siteUrl: siteUrl || null, fetchedAt: now(), rows, errors: [] });
  appendRun(connectorId, rows.length ? "COMPLETE" : "NO_DATA", { mode: "manual_import", recordsImported: rows.length });
  console.log(JSON.stringify({ connectorId, mode: "manual_import", status: rows.length ? "COMPLETE" : "NO_DATA", recordsImported: rows.length }, null, 2));
} else if (!siteUrl || !accessToken) {
  // Do NOT overwrite a good snapshot with an empty one. This branch used to write
  // rows: [], and any caller that commits data/intelligence/*.json would then erase
  // real measured demand simply by forgetting to pass a credential. The BUDGET_HELD
  // branch below already preserves the last real snapshot; this one now matches it.
  statusOnly(connectorId, "NOT_CONFIGURED", "GSC_SERVICE_ACCOUNT_JSON or GSC_ACCESS_TOKEN, or GSC_SEARCH_ANALYTICS_IMPORT_FILE, is required.");
} else if (!checkBudget(connectorId).allowed) {
  // Budget-held: leave the last real snapshot in place rather than overwriting it with empty data.
  statusOnly(connectorId, "BUDGET_HELD", checkBudget(connectorId).reason);
} else {
  try {
    const end = new Date();
    const start = new Date(Date.now() - 28 * 86400000);
    const body = { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), dimensions: ["query", "page"], rowLimit: 25000 };
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const data = await fetchJson(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const rows = normalizeRows(data);
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "live", siteUrl, fetchedAt: now(), rows, errors: [] });
    appendRun(connectorId, rows.length ? "COMPLETE" : "NO_DATA", { mode: "live", recordsImported: rows.length });
    console.log(JSON.stringify({ connectorId, mode: "live", status: rows.length ? "COMPLETE" : "NO_DATA", recordsImported: rows.length }, null, 2));
  } catch (error) {
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "failed", siteUrl, fetchedAt: now(), rows: [], errors: [{ code: "SOURCE_ERROR", message: error.message }] });
    appendRun(connectorId, "SOURCE_ERROR", { mode: "live", reason: error.message, recordsImported: 0 });
    throw error;
  }
}
