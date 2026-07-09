#!/usr/bin/env node
import fs from "node:fs";
import { env, fetchJson, writeJson, appendRun, statusOnly, now } from "./_lib.mjs";

const connectorId = "bing_webmaster";
const apiKey = env("BING_WEBMASTER_API_KEY");
const apiUrl = env("BING_WEBMASTER_API_URL");
const importFile = env("BING_WEBMASTER_IMPORT_FILE");
const outputFile = "data/intelligence/bing_webmaster.json";

function normalizeRows(raw) {
  const rows = Array.isArray(raw) ? raw : (raw.rows || raw.value || raw.data || []);
  return rows.map((row) => ({ ...row, importedAt: row.importedAt || now() }));
}

if (importFile) {
  const rows = normalizeRows(JSON.parse(fs.readFileSync(importFile, "utf8")));
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "manual_import", fetchedAt: now(), rows, errors: [] });
  appendRun(connectorId, rows.length ? "COMPLETE" : "NO_DATA", { mode: "manual_import", recordsImported: rows.length });
  console.log(JSON.stringify({ connectorId, mode: "manual_import", status: rows.length ? "COMPLETE" : "NO_DATA", recordsImported: rows.length }, null, 2));
} else if (!apiKey || !apiUrl) {
  writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "unavailable", fetchedAt: null, rows: [], errors: [{ code: "NOT_CONFIGURED", message: "Set BING_WEBMASTER_API_KEY and BING_WEBMASTER_API_URL, or provide BING_WEBMASTER_IMPORT_FILE." }] });
  statusOnly(connectorId, "NOT_CONFIGURED", "BING_WEBMASTER_API_KEY and BING_WEBMASTER_API_URL, or BING_WEBMASTER_IMPORT_FILE, are required.");
} else {
  try {
    const data = await fetchJson(apiUrl, { headers: { "Ocp-Apim-Subscription-Key": apiKey } });
    const rows = normalizeRows(data);
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "live", fetchedAt: now(), rows, errors: [] });
    appendRun(connectorId, rows.length ? "COMPLETE" : "NO_DATA", { mode: "live", recordsImported: rows.length });
    console.log(JSON.stringify({ connectorId, mode: "live", status: rows.length ? "COMPLETE" : "NO_DATA", recordsImported: rows.length }, null, 2));
  } catch (error) {
    writeJson(outputFile, { schemaVersion: "4.2.0", connectorId, mode: "failed", fetchedAt: now(), rows: [], errors: [{ code: "SOURCE_ERROR", message: error.message }] });
    appendRun(connectorId, "SOURCE_ERROR", { mode: "live", reason: error.message, recordsImported: 0 });
    throw error;
  }
}
