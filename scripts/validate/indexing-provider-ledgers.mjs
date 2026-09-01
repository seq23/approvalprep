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

// A receipt may only claim submissions on a run that actually reached the
// provider. submittedUrlCount and urls are populated before the budget check,
// so a held run was recording 86 submissions it never made - a connector
// reporting a win for work it did not do, in the one ledger the indexing
// scoreboard is built from.
const NON_SUBMITTING = new Set(["BUDGET_HELD", "NOT_CONFIGURED", "DRY_RUN", "NO_DATA", "FAILED"]);
const receipts = [indexnow.latest, ...indexnow.receipts].filter(Boolean);
if (!receipts.length) fail("[indexing-provider-ledgers] indexnow ledger holds no receipts to check");
let checked = 0;
for (const receipt of receipts) {
  if (!receipt.status) continue;
  checked += 1;
  if (!NON_SUBMITTING.has(receipt.status)) continue;
  if (receipt.submittedUrlCount) fail(`[indexing-provider-ledgers] ${receipt.status} receipt claims submittedUrlCount=${receipt.submittedUrlCount}; nothing was sent`);
  if ((receipt.urls || []).length) fail(`[indexing-provider-ledgers] ${receipt.status} receipt lists ${(receipt.urls || []).length} submitted URLs; nothing was sent`);
}
if (!checked) fail("[indexing-provider-ledgers] examined 0 indexnow receipts");
console.log(`[indexing-provider-ledgers] OK indexnowReceipts=${checked}`);
