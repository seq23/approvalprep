#!/usr/bin/env node
import { readJson, exists, fail } from "./_common.mjs";
if (!exists("scripts/intelligence/ingest-cloudflare-crawler-logs.mjs")) fail("[cloudflare-crawler] missing ingestion script");
if (!exists("scripts/intelligence/build-crawler-gap-report.mjs")) fail("[cloudflare-crawler] missing gap report script");
const logs = readJson("data/intelligence/cloudflare_crawler_logs.json");
if (!logs.schemaVersion || !logs.connectorId || !logs.mode || !Array.isArray(logs.visits) || !Array.isArray(logs.errors)) fail("[cloudflare-crawler] invalid crawler log schema");
if (!["live","manual_import","unavailable","failed"].includes(logs.mode)) fail("[cloudflare-crawler] invalid mode " + logs.mode);
const report = readJson("data/intelligence/crawler_gap_report.json");
if (!report.schemaVersion || !Array.isArray(report.uncrawledRoutes) || typeof report.byBot !== "object") fail("[cloudflare-crawler] invalid gap report schema");
console.log("[cloudflare-crawler] OK");
