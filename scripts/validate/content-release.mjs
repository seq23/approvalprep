#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fail } from "./_common.mjs";

const generatedPath = "data/content/generated_answers.json";
const ledgerPath = "data/release/release_ledger.json";
const generatedBefore = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, "utf8") : null;
const ledgerBefore = fs.readFileSync(ledgerPath, "utf8");
const reportBefore = fs.existsSync("reports/self-healing-log.json") ? fs.readFileSync("reports/self-healing-log.json", "utf8") : null;

function restore() {
  if (generatedBefore === null) fs.rmSync(generatedPath, { force: true });
  else fs.writeFileSync(generatedPath, generatedBefore);
  fs.writeFileSync(ledgerPath, ledgerBefore);
  if (reportBefore === null) fs.rmSync("reports/self-healing-log.json", { force: true });
  else fs.writeFileSync("reports/self-healing-log.json", reportBefore);
}
function run(file, env = {}) {
  const result = spawnSync(process.execPath, [file], { stdio: "pipe", encoding: "utf8", env: { ...process.env, ...env } });
  if (result.status !== 0) fail(`[content-release] ${file} failed\n${result.stderr || result.stdout}`);
  return result.stdout;
}
function assertUnique(items, field) {
  const values = items.map((item) => item[field]).filter(Boolean);
  if (new Set(values).size !== values.length) fail(`[content-release] duplicate ${field}`);
}

try {
  const before = generatedBefore ? JSON.parse(generatedBefore) : { answers: [] };
  const beforeCount = before.answers?.length || 0;
  const testDate = "2099-12-31";
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: testDate, CONTENT_RELEASE_LIMIT: "3" });
  run("scripts/content/self-heal.mjs");
  const afterFirst = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  const added = afterFirst.answers.filter((item) => item.releaseId === `content-release-${testDate}`);
  if (afterFirst.schemaVersion !== "2.1.0") fail("[content-release] generated answers schema mismatch");
  if (afterFirst.answers.length < beforeCount) fail("[content-release] cumulative answer library shrank");
  if (added.length > 3) fail(`[content-release] safety ceiling exceeded: ${added.length}`);
  if (!added.length) fail("[content-release] fixture release produced no distinct low-risk pages");
  if (!added.every((item) => item.riskLevel === "low" && item.status === "published_by_contract")) fail("[content-release] non-low-risk content escaped fixture release");
  if (!added.every((item) => item.slug && item.contentHash && item.contentKey && item.publishedAt && item.steps?.length >= 3 && item.checklist?.length >= 3)) fail("[content-release] released answer missing structured publication fields");
  for (const field of ["id", "title", "slug", "contentKey", "contentHash"]) assertUnique(afterFirst.answers, field);
  const countAfterFirst = afterFirst.answers.length;
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: testDate, CONTENT_RELEASE_LIMIT: "3" });
  const afterSecond = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  if (afterSecond.answers.length !== countAfterFirst) fail("[content-release] same-day rerun was not idempotent");
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const releaseRows = (ledger.releases || []).filter((item) => item.id === `content-release-${testDate}`);
  if (releaseRows.length !== 1) fail(`[content-release] expected one idempotent fixture ledger row, found ${releaseRows.length}`);
  console.log(`[content-release] OK cumulative=${beforeCount} fixtureAdded=${added.length} idempotent=true`);
} finally {
  restore();
}
