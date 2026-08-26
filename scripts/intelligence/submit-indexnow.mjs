#!/usr/bin/env node
import fs from "node:fs";
import { env, readJson, fetchJson, writeJson, appendRun, statusOnly, now, checkBudget } from "./_lib.mjs";

const connectorId = "indexnow";
// An IndexNow key is not a secret: the protocol verifies ownership by requiring
// the same value to be readable at https://<host>/<key>.txt, so it is public by
// construction. Treating it as a secret is what kept this lane dead — the repo
// shipped the literal placeholder "INDEXNOW_KEY_CONFIGURED_IN_ENV" as the key
// file, no INDEXNOW_KEY was ever set, and every run recorded NOT_CONFIGURED
// with submittedUrlCount 0. The key now lives in public/indexnow-key.txt (and
// is published at public/<key>.txt), so the lane works with no secret plumbing.
// INDEXNOW_KEY still wins if set, for rotation.
const keyFromFile = (() => {
  try {
    const value = fs.readFileSync("public/indexnow-key.txt", "utf8").trim();
    return /^[A-Za-z0-9-]{8,128}$/.test(value) ? value : "";
  } catch {
    return "";
  }
})();
const key = env("INDEXNOW_KEY") || keyFromFile;
const site = (env("APPROVALPREP_SITE_URL") || "https://approvalprep.com").replace(/\/$/, "");
const mode = env("RUN_MODE") || env("INDEXNOW_MODE") || "dry_run";
const host = site.replace(/^https?:\/\//, "");
const manifest = readJson("data/routes/route_manifest.json", { routes: [] });
const previous = readJson("data/intelligence/indexnow_intelligence_receipts.json", { receipts: [] });
const priorSubmitted = new Set((previous.receipts || []).flatMap((receipt) => receipt.urls || receipt.urlList || []).filter(Boolean));
const urls = manifest.routes
  .filter((route) => route.index !== false && route.type !== "admin")
  .map((route) => `${site}${route.path === "/" ? "" : route.path}`);
const changedOnly = (env("INDEXNOW_CHANGED_ONLY") || "true") !== "false";
const urlList = changedOnly ? urls.filter((url) => !priorSubmitted.has(url)) : urls;

if (!key) {
  writeJson("data/intelligence/indexnow_intelligence_receipts.json", { schemaVersion: "4.2.0", mode: "unavailable", receipts: previous.receipts || [], latest: { submittedAt: null, preparedUrlCount: urls.length, submittedUrlCount: 0, status: "NOT_CONFIGURED", errors: [{ code: "NOT_CONFIGURED", message: "Set INDEXNOW_KEY to submit URLs." }] } });
  statusOnly(connectorId, "NOT_CONFIGURED", "INDEXNOW_KEY is required for live submission.");
} else {
  const receipt = { submittedAt: now(), provider: "IndexNow", mode, host, keyLocation: `${site}/${key}.txt`, preparedUrlCount: urls.length, submittedUrlCount: mode === "live" ? urlList.length : 0, urls: mode === "live" ? urlList : [], dryRunPreparedUrls: mode === "live" ? [] : urlList.slice(0, 250), changedOnly, status: mode === "live" ? "READY" : "DRY_RUN", response: null, errors: [], claimsIndexed: false, rankingProof: false };
  const budget = mode === "live" ? checkBudget(connectorId) : { allowed: true };
  if (mode === "live" && urlList.length && !budget.allowed) {
    receipt.status = "BUDGET_HELD";
    receipt.errors.push({ code: "BUDGET_HELD", message: budget.reason });
    appendRun(connectorId, "BUDGET_HELD", { mode, reason: budget.reason, recordsImported: 0 });
    writeJson("data/intelligence/indexnow_intelligence_receipts.json", { schemaVersion: "4.2.0", mode, receipts: [receipt, ...(previous.receipts || [])].slice(0, 100), latest: receipt });
    console.log(JSON.stringify({ connectorId, mode, status: receipt.status, preparedUrlCount: receipt.preparedUrlCount, submittedUrlCount: receipt.submittedUrlCount }, null, 2));
    process.exit(0);
  }
  if (mode === "live" && urlList.length) {
    try {
      receipt.response = await fetchJson("https://api.indexnow.org/indexnow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host, key, keyLocation: receipt.keyLocation, urlList }) });
      receipt.status = "SUBMITTED";
    } catch (error) {
      receipt.status = "SOURCE_ERROR";
      receipt.errors.push({ code: "SOURCE_ERROR", message: error.message });
      appendRun(connectorId, "SOURCE_ERROR", { mode, reason: error.message, recordsImported: 0 });
      writeJson("data/intelligence/indexnow_intelligence_receipts.json", { schemaVersion: "4.2.0", mode, receipts: [receipt, ...(previous.receipts || [])].slice(0, 100), latest: receipt });
      throw error;
    }
  } else if (mode === "live") {
    receipt.status = "NO_DATA";
  }
  writeJson("data/intelligence/indexnow_intelligence_receipts.json", { schemaVersion: "4.2.0", mode, receipts: [receipt, ...(previous.receipts || [])].slice(0, 100), latest: receipt });
  appendRun(connectorId, receipt.status === "SUBMITTED" ? "COMPLETE" : receipt.status === "NO_DATA" ? "NO_DATA" : "COMPLETE", { mode, recordsImported: receipt.submittedUrlCount, preparedUrlCount: receipt.preparedUrlCount });
  console.log(JSON.stringify({ connectorId, mode, status: receipt.status, preparedUrlCount: receipt.preparedUrlCount, submittedUrlCount: receipt.submittedUrlCount }, null, 2));
}
