#!/usr/bin/env node
/**
 * The guard for validate:content-release itself.
 *
 * Two defects shipped inside that fixture and neither was visible from its own
 * green line:
 *
 *  1. It read the live publication budget. generate-candidate.mjs clamps to the
 *     remaining allowance under data/cadence/policy.json new_pages_per_week, and
 *     the fixture left the real data/cadence/known_urls.json in place. On
 *     2026-08-30 scheduled-content-release spent the weekly window at 10:18,
 *     citation-os-daily ran at 10:40 against remaining=0, the fixture published
 *     nothing, and self-heal.mjs correctly refused to certify an empty corpus.
 *     A deliberate throttle took a scheduled workflow red.
 *
 *  2. fail() is process.exit(1), which does not run the fixture's `finally`. Any
 *     failing run left production data/content/generated_answers.json and
 *     data/release/release_ledger.json at their fixture values - an empty corpus
 *     on disk, in a repo whose workflows `git add` that exact path.
 *
 * Both are injected here and both must be survivable. Every injection asserts
 * that it actually took effect before it is trusted: a guard that cannot reach
 * the condition it governs passes on nothing, which is the failure mode this
 * repo keeps finding.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fail } from "./_common.mjs";
import { publicationBudget } from "../lib/publication_budget.mjs";

const fixture = "scripts/validate/content-release.mjs";
const cadenceLedgerPath = "data/cadence/known_urls.json";
const cadencePolicyPath = "data/cadence/policy.json";
const releaseCadencePath = "data/strategy/content_release_cadence.json";
const generatedPath = "data/content/generated_answers.json";
const ledgerPath = "data/release/release_ledger.json";

const snapshot = new Map();
for (const path of [cadenceLedgerPath, releaseCadencePath, generatedPath, ledgerPath]) {
  snapshot.set(path, fs.existsSync(path) ? fs.readFileSync(path, "utf8") : null);
}
let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  for (const [path, before] of snapshot) {
    if (before === null) fs.rmSync(path, { force: true });
    else fs.writeFileSync(path, before);
  }
}
process.on("exit", restore);

const runFixture = () => spawnSync(process.execPath, [fixture], { stdio: "pipe", encoding: "utf8" });

const checks = [];

// --- Injection 1: a fully spent cadence window ------------------------------
const policy = JSON.parse(fs.readFileSync(cadencePolicyPath, "utf8"));
const cap = Number(policy.new_pages_per_week);
if (!Number.isFinite(cap) || cap < 1) fail(`[release-fixture-isolation] ${cadencePolicyPath} new_pages_per_week is not a usable cap: ${policy.new_pages_per_week}`);
const today = new Date().toISOString().slice(0, 10);
const liveLedger = JSON.parse(fs.readFileSync(cadenceLedgerPath, "utf8"));
fs.writeFileSync(cadenceLedgerPath, JSON.stringify({
  ...liveLedger,
  accepted_reason: "release-fixture-isolation injection: window deliberately spent, restored before exit",
  history: [{ date: today, added: cap }],
}, null, 2) + "\n");
const injected = publicationBudget();
if (injected.remaining !== 0) {
  fail(`[release-fixture-isolation] could not drive the publication budget to 0; the injection did not reach the thing it governs: ${JSON.stringify(injected)}`);
}
const spentRun = runFixture();
if (spentRun.status !== 0) {
  fail(`[release-fixture-isolation] validate:content-release fails when the live cadence window is spent - the fixture is still reading production cadence state.\n${spentRun.stdout}${spentRun.stderr}`);
}
const added = Number(/fixtureAdded=(\d+)/.exec(spentRun.stdout || "")?.[1]);
if (!Number.isFinite(added) || added < 1) {
  fail(`[release-fixture-isolation] fixture exited 0 having published nothing (fixtureAdded=${added}); an empty fixture asserts nothing.\n${spentRun.stdout}`);
}
checks.push(`cadence-window-spent(cap=${cap}, remaining=0) -> fixture PASS with fixtureAdded=${added}`);
restore();
restored = false;

// --- Injection 2: a failing fixture must not keep production state ----------
const releaseCadence = JSON.parse(fs.readFileSync(releaseCadencePath, "utf8"));
const beforeGenerated = fs.readFileSync(generatedPath, "utf8");
const beforeLedger = fs.readFileSync(ledgerPath, "utf8");
const forced = JSON.parse(JSON.stringify(releaseCadence));
forced.cadence = forced.cadence || {};
forced.cadence.dailyShortAnswers = { ...(forced.cadence.dailyShortAnswers || {}), targetPerDay: 0 };
fs.writeFileSync(releaseCadencePath, JSON.stringify(forced, null, 2) + "\n");
const failingRun = runFixture();
if (failingRun.status === 0) {
  fail("[release-fixture-isolation] forced-failure injection did not make validate:content-release fail; the restore path was never exercised, so this check proves nothing.");
}
if (fs.readFileSync(generatedPath, "utf8") !== beforeGenerated) {
  fail(`[release-fixture-isolation] a failing validate:content-release left production ${generatedPath} at its fixture value. fail() is process.exit(1) and does not run a finally block.`);
}
if (fs.readFileSync(ledgerPath, "utf8") !== beforeLedger) {
  fail(`[release-fixture-isolation] a failing validate:content-release left production ${ledgerPath} at its fixture value.`);
}
checks.push("forced-failure -> production answer corpus and release ledger restored byte-for-byte");
restore();

if (checks.length !== 2) fail(`[release-fixture-isolation] expected 2 injections, ran ${checks.length}`);
console.log(`[release-fixture-isolation] OK ${checks.length} injections; ${checks.join("; ")}`);
