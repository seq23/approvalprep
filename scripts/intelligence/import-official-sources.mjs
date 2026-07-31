#!/usr/bin/env node

import { readJson, writeJson, appendRun, now } from "./_lib.mjs";

const connectorId = "official_source_fetcher";
const requestTimeoutMs = 8_000;
const concurrency = 5;
const sources = readJson("data/citations/source_registry.json", { sources: [] })
  .sources
  .filter((source) => source.url && /^https?:/.test(source.url))
  .slice(0, 50);

async function inspectSource(source) {
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "ApprovalPrepBot/1.0 source verification; contact hello@approvalprep.com" },
      signal: AbortSignal.timeout(requestTimeoutMs)
    });
    const text = await response.text();
    return {
      sourceId: source.id,
      url: source.url,
      status: response.status,
      title: (text.match(/<title[^>]*>(.*?)<\/title>/is)?.[1] || "").trim().slice(0, 160),
      checkedAt: now()
    };
  } catch (error) {
    return {
      sourceId: source.id,
      url: source.url,
      status: "SOURCE_ERROR",
      error: error instanceof Error ? error.message : String(error),
      checkedAt: now()
    };
  }
}

const snapshots = [];
for (let index = 0; index < sources.length; index += concurrency) {
  snapshots.push(...await Promise.all(sources.slice(index, index + concurrency).map(inspectSource)));
}

writeJson("data/intelligence/official_source_snapshots.json", { schemaVersion: "4.1.0", snapshots });
appendRun(connectorId, snapshots.length ? "COMPLETE" : "NO_DATA", { recordsImported: snapshots.length });
console.log(JSON.stringify({ connectorId, status: snapshots.length ? "COMPLETE" : "NO_DATA", recordsImported: snapshots.length }, null, 2));
