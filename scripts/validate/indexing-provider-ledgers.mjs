#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";
for (const file of ["data/intelligence/gsc_search_analytics.json","data/intelligence/gsc_url_inspection.json","data/intelligence/bing_webmaster.json"]) {
  const data = readJson(file);
  if (!data.schemaVersion || !data.connectorId || !data.mode || !Array.isArray(data.rows) || !Array.isArray(data.errors)) fail(`[indexing-provider-ledgers] invalid schema ${file}`);
  if (!["live","manual_import","unavailable","failed"].includes(data.mode)) fail(`[indexing-provider-ledgers] invalid mode ${file}`);
}
const indexnow = readJson("data/intelligence/indexnow_intelligence_receipts.json");
if (!indexnow.schemaVersion || !Array.isArray(indexnow.receipts) || !indexnow.latest) fail("[indexing-provider-ledgers] invalid indexnow ledger");
if (JSON.stringify(indexnow).toLowerCase().includes("guaranteed indexing")) fail("[indexing-provider-ledgers] unsupported indexing guarantee");
console.log("[indexing-provider-ledgers] OK");
