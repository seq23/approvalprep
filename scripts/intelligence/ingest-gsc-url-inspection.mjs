#!/usr/bin/env node
import fs from "node:fs";
import { env, fetchJson, readJson, writeJson, appendRun, statusOnly, now } from "./_lib.mjs";

const connectorId = "google_url_inspection";
const siteUrl = env("GSC_SITE_URL") || env("GOOGLE_SEARCH_CONSOLE_SITE_URL");
const accessToken = env("GSC_ACCESS_TOKEN") || env("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN");
const importFile = env("GSC_URL_INSPECTION_IMPORT_FILE");
const baseUrl = (env("APPROVALPREP_SITE_URL") || siteUrl || "https://approvalprep.com").replace(/\/$/, "");
const outputFile = "data/intelligence/gsc_url_inspection.json";

function normalizeRows(raw) {
  const rows = Array.isArray(raw) ? raw : (raw.rows || raw.urls || []);
  return rows.map((row) => ({
    route: row.route || (row.inspectionUrl ? new URL(row.inspectionUrl).pathname : row.url || ""),
    inspectionUrl: row.inspectionUrl || row.url || "",
    verdict: row.verdict || row.coverageState || row.result?.indexStatusResult?.verdict || "UNKNOWN",
    result: row.result || row,
    importedAt: now()
  })).filter((row) => row.inspectionUrl || row.route);
}

if (importFile) {
  const rows = normalizeRows(JSON.parse(fs.readFileSync(importFile, "utf8")));
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "manual_import", siteUrl: siteUrl || null, fetchedAt: now(), rows, errors: [] });
  appendRun(connectorId, rows.length ? "COMPLETE" : "NO_DATA", { mode: "manual_import", recordsImported: rows.length });
  console.log(JSON.stringify({ connectorId, mode: "manual_import", status: rows.length ? "COMPLETE" : "NO_DATA", recordsImported: rows.length }, null, 2));
} else if (!siteUrl || !accessToken) {
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "unavailable", siteUrl: siteUrl || null, fetchedAt: null, rows: [], errors: [{ code: "NOT_CONFIGURED", message: "Set GSC_SITE_URL and GSC_ACCESS_TOKEN, or provide GSC_URL_INSPECTION_IMPORT_FILE." }] });
  statusOnly(connectorId, "NOT_CONFIGURED", "GSC_SITE_URL and GSC_ACCESS_TOKEN, or GSC_URL_INSPECTION_IMPORT_FILE, are required.");
} else {
  const routes = readJson("data/routes/route_manifest.json", { routes: [] }).routes.filter((route) => route.index !== false).slice(0, Number(env("GSC_URL_INSPECTION_LIMIT") || 25));
  const rows = [];
  try {
    for (const route of routes) {
      const inspectionUrl = `${baseUrl}${route.path === "/" ? "" : route.path}`;
      const data = await fetchJson("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ inspectionUrl, siteUrl }) });
      rows.push({ route: route.path, inspectionUrl, verdict: data.inspectionResult?.indexStatusResult?.verdict || "UNKNOWN", result: data.inspectionResult || data, importedAt: now() });
    }
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "live", siteUrl, fetchedAt: now(), rows, errors: [] });
    appendRun(connectorId, rows.length ? "COMPLETE" : "NO_DATA", { mode: "live", recordsImported: rows.length });
    console.log(JSON.stringify({ connectorId, mode: "live", status: rows.length ? "COMPLETE" : "NO_DATA", recordsImported: rows.length }, null, 2));
  } catch (error) {
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "failed", siteUrl, fetchedAt: now(), rows, errors: [{ code: "SOURCE_ERROR", message: error.message }] });
    appendRun(connectorId, "SOURCE_ERROR", { mode: "live", reason: error.message, recordsImported: rows.length });
    throw error;
  }
}
