#!/usr/bin/env node
import { env, readJson, fetchJson, writeJson, appendRun, statusOnly, now } from "./_lib.mjs";

const connectorId = "indexnow";
const key = env("INDEXNOW_KEY");
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
