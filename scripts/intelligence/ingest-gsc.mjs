#!/usr/bin/env node
import fs from "node:fs";
import { env, fetchJson, writeJson, appendRun, statusOnly, now } from "./_lib.mjs";

const connectorId = "google_search_console_search_analytics";
const siteUrl = env("GSC_SITE_URL") || env("GOOGLE_SEARCH_CONSOLE_SITE_URL");
const accessToken = env("GSC_ACCESS_TOKEN") || env("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN");
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
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "unavailable", siteUrl: siteUrl || null, fetchedAt: null, rows: [], errors: [{ code: "NOT_CONFIGURED", message: "Set GSC_SITE_URL and GSC_ACCESS_TOKEN, or provide GSC_SEARCH_ANALYTICS_IMPORT_FILE." }] });
  statusOnly(connectorId, "NOT_CONFIGURED", "GSC_SITE_URL and GSC_ACCESS_TOKEN, or GSC_SEARCH_ANALYTICS_IMPORT_FILE, are required.");
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
