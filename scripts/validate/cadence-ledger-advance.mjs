#!/usr/bin/env node
/**
 * Cadence ledger advance guard.
 *
 * The cadence gate measures "new since the last run" against
 * data/cadence/known_urls.json. Two failure modes sit either side of that
 * ledger, and this guard holds both open at once, because closing one by
 * reopening the other is exactly how the repo got here.
 *
 *   1. If CHECKING writes the ledger, the gate consumes its own evidence: any
 *      block clears itself on the next run with no change to the tree. That is
 *      the bug 647eba0 fixed by putting the write behind --accept.
 *
 *   2. If the PUBLISHING workflow never writes the ledger, the baseline freezes
 *      while content:release keeps adding pages, so the count of new URLs climbs
 *      every day until it crosses new_pages_per_week and stays over it forever.
 *      That is a permanent daily red with no bad release behind it. Measured on
 *      the pre-fix scheduled-content-release.yml at one page per day: CLEAR,
 *      CLEAR, then BLOCKED on day 3 and every day after.
 *
 * Fixing (1) is what introduced (2): the write was removed from the script but
 * scheduled-content-release.yml was left relying on it, and its comment still
 * described the removed behaviour. So this guard asserts the contract that
 * spans the two - checking is read-only, publishing accepts - rather than
 * either half alone.
 *
 * The ledger behaviour is exercised for real in a temp directory rather than
 * pattern-matched out of the source, so a rewrite of cadence_gate.cjs that
 * reintroduces either failure mode is caught by what it does, not by how it
 * reads.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const gate = path.join(root, "scripts/cadence_gate.cjs");
const errors = [];

/* ---------- part 1: the workflow contract ---------- */

const workflowDir = ".github/workflows";
const files = fs.readdirSync(workflowDir).filter((n) => /\.ya?ml$/.test(n)).sort();

// A publishing workflow is one that both runs the gate and commits the result
// back to main. Those are the only workflows that can - and must - advance the
// ledger; validate.yml runs the gate and commits nothing, so it is exempt.
const publishers = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(workflowDir, file), "utf8");
  // Ordering is a property of the steps, not of the prose around them. Comment
  // lines are blanked rather than dropped so offsets still line up with the file.
  const text = raw.replace(/^\s*#.*$/gm, (line) => " ".repeat(line.length));
  if (!/cadence:gate/.test(text)) continue;
  const commits = /git\s+commit/.test(text) || /safe-push-main\.sh/.test(text);
  if (!commits) continue;

  const acceptAt = text.search(/cadence:gate\s+--\s+--accept\b/);
  const checkAt = text.search(/run:\s*npm run cadence:gate\s*$/m);
  const commitAt = text.search(/git\s+add\s+data\b/);
  publishers.push({ workflow: file, acceptAt, checkAt, commitAt });

  if (acceptAt === -1) {
    errors.push(
      `${file}: runs the cadence gate and commits to main but never runs ` +
      `\`npm run cadence:gate -- --accept\`. Nothing else writes ` +
      `data/cadence/known_urls.json, so the baseline freezes and the weekly cap ` +
      `turns into a ratchet that blocks this workflow permanently.`,
    );
    continue;
  }
  if (!/--accept[\s\S]{0,400}?--reason/.test(text)) {
    errors.push(`${file}: --accept is used without --reason; the ledger must record a decision, not a re-run.`);
  }
  if (checkAt !== -1 && acceptAt < checkAt) {
    errors.push(`${file}: the --accept step runs before the blocking cadence gate, so an over-cap release would record itself as accepted.`);
  }
  if (commitAt !== -1 && acceptAt > commitAt) {
    errors.push(`${file}: the --accept step runs after \`git add data\`, so the advanced ledger is never committed.`);
  }
}
if (!publishers.length) {
  errors.push("no workflow both runs the cadence gate and commits to main, so nothing advances data/cadence/known_urls.json.");
}

/* ---------- part 2: what the gate actually does to the ledger ---------- */

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "approvalprep-cadence-ledger-"));
const scenarios = [];
const sitemap = (n) =>
  `<urlset>${Array.from({ length: n }, (_, i) =>
    `<url><loc>https://approvalprep.com/p${i + 1}/</loc><lastmod>2026-09-01</lastmod></url>`).join("")}</urlset>`;

function runGate(args) {
  return spawnSync("node", [gate, ...args], {
    cwd: temp, encoding: "utf8",
    env: { ...process.env, CADENCE_TODAY: "2026-09-01" },
  });
}
const ledgerFile = path.join(temp, "data/cadence/known_urls.json");
const readLedger = () => JSON.parse(fs.readFileSync(ledgerFile, "utf8")).urls;
function scenario(id, ok, detail) {
  scenarios.push({ id, status: ok ? "PASS" : "FAIL", ...(ok ? {} : { detail }) });
  if (!ok) errors.push(`${id}: ${detail}`);
}

try {
  fs.mkdirSync(path.join(temp, "data/cadence"), { recursive: true });
  fs.writeFileSync(path.join(temp, "data/cadence/policy.json"), JSON.stringify({
    refresh_window_days: 91, high_value_window_days: 30, stale_tolerance_pct: 20,
    require_lastmod: true, new_pages_per_week: 2, refresh_capacity_per_week: 8,
  }));
  fs.writeFileSync(ledgerFile, JSON.stringify({
    generated_at: "2026-09-01", accepted_reason: "fixture baseline",
    urls: ["https://approvalprep.com/p1/"],
  }));

  // Two new URLs against a cap of two: clears, and must leave the ledger alone.
  fs.writeFileSync(path.join(temp, "sitemap.xml"), sitemap(3));
  const before = fs.readFileSync(ledgerFile, "utf8");
  const check = runGate([]);
  scenario("check_clears_within_cap", check.status === 0, `expected exit 0, got ${check.status}: ${check.stdout}`);
  scenario("check_does_not_write_ledger", fs.readFileSync(ledgerFile, "utf8") === before,
    "a plain cadence:gate run rewrote data/cadence/known_urls.json; the gate is consuming its own evidence and any block will clear itself on the next run");

  // --accept is the one path that may move the baseline.
  const accepted = runGate(["--accept", "--reason", "fixture acceptance"]);
  scenario("accept_advances_ledger", accepted.status === 0 && readLedger().length === 3,
    `expected --accept to record 3 urls, got exit ${accepted.status} and ${(() => { try { return readLedger().length; } catch { return "unreadable"; } })()}`);

  // ...and only with a stated reason.
  const noReason = runGate(["--accept"]);
  scenario("accept_requires_reason", noReason.status !== 0,
    "--accept without --reason succeeded; the ledger must record why an overage was accepted");

  // The cap still bites: five new URLs against a cap of two must block.
  fs.writeFileSync(path.join(temp, "sitemap.xml"), sitemap(8));
  const over = runGate([]);
  scenario("cap_still_blocks_over_limit", over.status !== 0,
    `5 new URLs against a cap of 2 exited ${over.status}; the publication cap is not blocking`);
} catch (error) {
  scenario("ledger_behaviour_fixture", false, error.message);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: errors.length ? "FAIL" : "PASS",
  ledger: "data/cadence/known_urls.json",
  publishingWorkflows: publishers.map((p) => ({ workflow: p.workflow, advancesLedger: p.acceptAt !== -1 })),
  scenarios,
  errors,
};
fs.mkdirSync("reports/cadence", { recursive: true });
fs.writeFileSync("reports/cadence/ledger-advance.json", JSON.stringify(report, null, 2) + "\n");

if (errors.length) {
  console.error(`[cadence-ledger-advance] FAIL\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`[cadence-ledger-advance] OK publishers=${publishers.length} scenarios=${scenarios.length}`);
