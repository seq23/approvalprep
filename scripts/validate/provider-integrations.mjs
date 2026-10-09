#!/usr/bin/env node
import fs from "node:fs";
import { readJson, exists, fail } from "./_common.mjs";
import { inspectionBaseUrl, inspectionUrlFor } from "../intelligence/_lib.mjs";
const registry = readJson("data/intelligence/source_connector_registry.json");
const required = [
  ["google_search_console_search_analytics", "scripts/intelligence/ingest-gsc.mjs", "data/intelligence/gsc_search_analytics.json"],
  ["google_url_inspection", "scripts/intelligence/ingest-gsc-url-inspection.mjs", "data/intelligence/gsc_url_inspection.json"],
  ["bing_webmaster", "scripts/intelligence/ingest-bing-webmaster.mjs", "data/intelligence/bing_webmaster.json"],
  ["indexnow", "scripts/intelligence/submit-indexnow.mjs", "data/intelligence/indexnow_intelligence_receipts.json"],
  ["cloudflare_crawler_logs", "scripts/intelligence/ingest-cloudflare-crawler-logs.mjs", "data/intelligence/cloudflare_crawler_logs.json"]
];
const ids = new Set(registry.connectors.map((connector) => connector.id));
for (const [id, script, dataFile] of required) {
  if (!ids.has(id)) fail(`[provider-integrations] missing connector registry entry ${id}`);
  if (!exists(script)) fail(`[provider-integrations] missing connector script ${script}`);
  if (!exists(dataFile)) fail(`[provider-integrations] missing provider data file ${dataFile}`);
  const src = fs.readFileSync(script, "utf8");
  if (/fake|stub|lorem|TODO/i.test(src)) fail(`[provider-integrations] placeholder marker in ${script}`);
  if (!/(NOT_CONFIGURED|manual_import|fetchJson|statusOnly)/.test(src)) fail(`[provider-integrations] ${script} lacks honest connector state handling`);
}
// URL Inspection must send a real URL inside the property, never the
// "sc-domain:" siteUrl itself (the 403 "you do not own this site" until 8 Oct 2026).
for (const [site, override, want] of [
  ["sc-domain:approvalprep.com", "", "https://approvalprep.com"],
  ["sc-domain:example.org", "", "https://example.org"],
  ["sc-domain:approvalprep.com", "https://approvalprep.com/", "https://approvalprep.com"],
  ["https://approvalprep.com/", "", "https://approvalprep.com"]
]) {
  const got = inspectionBaseUrl(site, override);
  if (got !== want) fail(`[provider-integrations] inspectionBaseUrl(${site}, ${override || "-"}) = ${got}, want ${want}`);
}
if (inspectionUrlFor("https://approvalprep.com", "/sba-loan-checklist") !== "https://approvalprep.com/sba-loan-checklist/") fail("[provider-integrations] inspection URL must be the canonical trailing-slash URL");
const inspectionSrc = fs.readFileSync("scripts/intelligence/ingest-gsc-url-inspection.mjs", "utf8");
if (!/inspectionBaseUrl\(/.test(inspectionSrc) || !/inspectionUrlFor\(/.test(inspectionSrc)) fail("[provider-integrations] URL Inspection must build its URLs with inspectionBaseUrl/inspectionUrlFor");
console.log("[provider-integrations] OK");
