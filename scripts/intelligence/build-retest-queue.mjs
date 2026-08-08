#!/usr/bin/env node
import { readJson, writeJson, appendRun } from "./_lib.mjs";

const connectorId = "retest_queue_builder";
const queueFile = "data/authority_scale/retest_queue.json";
const dayMs = 86400000;

const queue = readJson(queueFile, { schemaVersion: "1.0.0", minDelayDays: 14, entries: [] });
const minDelayDays = queue.minDelayDays || 14;
const existingIds = new Set(queue.entries.map((entry) => entry.id));

function addCandidate(id, sourceType, sourceId, route, repairedAt) {
  if (!repairedAt || existingIds.has(id)) return;
  const repairedTime = new Date(repairedAt).getTime();
  if (!Number.isFinite(repairedTime)) return;
  queue.entries.push({
    id,
    sourceType,
    sourceId,
    route: route || null,
    repairedAt,
    retestEligibleAt: new Date(repairedTime + minDelayDays * dayMs).toISOString(),
    status: "AWAITING_RETEST"
  });
  existingIds.add(id);
}

// Only actually-applied repairs (mode !== "dry_run") are retest candidates; fixture/dry-run
// entries never shipped a change, so scheduling a retest for them would fabricate evidence.
const selfHeal = readJson("data/automation/self_healing_log.json", { entries: [] }).entries || [];
for (const entry of selfHeal) {
  if (entry.mode === "dry_run") continue;
  if (entry.status !== "SELF_HEAL_ATTEMPTED" && entry.status !== "REPUBLISHED") continue;
  addCandidate(`self_heal:${entry.route}:${entry.at}`, "self_heal_attempt", entry.route, entry.route, entry.at);
}

const republish = readJson("data/automation/republication_queue.json", { mode: "dry_run", items: [] });
if (republish.mode !== "dry_run") {
  for (const item of republish.items || []) {
    addCandidate(`republication:${item.id || item.route}:${item.queuedAt || item.at}`, "republication", item.id || item.route, item.route || null, item.queuedAt || item.at);
  }
}

const safeHarbor = readJson("data/governance/safe_harbor_rewrite_ledger.json", { rewrites: [] });
for (const rewrite of safeHarbor.rewrites || []) {
  if (rewrite.mode === "dry_run") continue;
  addCandidate(`safe_harbor:${rewrite.id || rewrite.route}:${rewrite.appliedAt || rewrite.at}`, "safe_harbor_rewrite", rewrite.id || rewrite.route, rewrite.route || null, rewrite.appliedAt || rewrite.at);
}

writeJson(queueFile, queue);
appendRun(connectorId, "COMPLETE", { recordsImported: queue.entries.length });
console.log(JSON.stringify({ connectorId, status: "COMPLETE", queueSize: queue.entries.length }, null, 2));
