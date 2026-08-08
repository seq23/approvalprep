#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";

const queue = readJson("data/authority_scale/retest_queue.json");
const ledger = readJson("data/authority_scale/retest_outcome_ledger.json");
if (!queue || !Array.isArray(queue.entries)) fail("[retest-lifecycle] missing or invalid data/authority_scale/retest_queue.json");
if (!ledger || !Array.isArray(ledger.outcomes)) fail("[retest-lifecycle] missing or invalid data/authority_scale/retest_outcome_ledger.json");

const minDelayMs = (queue.minDelayDays || 14) * 86400000 - 60000;
const allowedStatus = new Set(["AWAITING_RETEST", "RETEST_ELIGIBLE", "RETESTED"]);
for (const entry of queue.entries) {
  if (!entry.id || !entry.repairedAt || !entry.retestEligibleAt || !entry.status) fail(`[retest-lifecycle] incomplete retest entry ${entry.id || "(no id)"}`);
  if (!allowedStatus.has(entry.status)) fail(`[retest-lifecycle] invalid status ${entry.status} for ${entry.id}`);
  const delay = new Date(entry.retestEligibleAt).getTime() - new Date(entry.repairedAt).getTime();
  if (!(delay >= minDelayMs)) fail(`[retest-lifecycle] retest delay too short for ${entry.id} (anti-thrash floor is ${queue.minDelayDays || 14} days)`);
}

const allowedOutcomes = new Set(["IMPROVED", "UNCHANGED", "REGRESSED", "INCONCLUSIVE"]);
for (const outcome of ledger.outcomes) {
  if (!outcome.id || !outcome.retestQueueId || !outcome.evaluatedAt || !outcome.evidenceSource) fail(`[retest-lifecycle] incomplete outcome ${outcome.id || "(no id)"}`);
  if (!allowedOutcomes.has(outcome.outcome)) fail(`[retest-lifecycle] invalid outcome value ${outcome.outcome}`);
  if ((outcome.outcome === "IMPROVED" || outcome.outcome === "REGRESSED") && outcome.evidenceSource === "unavailable") {
    fail(`[retest-lifecycle] ${outcome.outcome} outcome must not rest on unavailable evidence (${outcome.id})`);
  }
}

console.log(`[retest-lifecycle] OK queueEntries=${queue.entries.length} outcomes=${ledger.outcomes.length}`);
