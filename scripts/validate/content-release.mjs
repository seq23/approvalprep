#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fail } from "./_common.mjs";

const generatedPath = "data/content/generated_answers.json";
const ledgerPath = "data/release/release_ledger.json";
const generatedBefore = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, "utf8") : null;
const ledgerBefore = fs.readFileSync(ledgerPath, "utf8");
const reportPath = "reports/self-healing-log.json";
const reportBefore = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : null;

function restore() {
  if (generatedBefore === null) fs.rmSync(generatedPath, { force: true });
  else fs.writeFileSync(generatedPath, generatedBefore);
  fs.writeFileSync(ledgerPath, ledgerBefore);
  if (reportBefore === null) fs.rmSync(reportPath, { force: true });
  else fs.writeFileSync(reportPath, reportBefore);
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
function resetFixtureState() {
  fs.mkdirSync("data/content", { recursive: true });
  fs.mkdirSync("data/release", { recursive: true });
  fs.writeFileSync(generatedPath, JSON.stringify({ schemaVersion: "2.1.0", generatedAt: "2099-12-31T00:00:00.000Z", answers: [] }, null, 2) + "\n");
  fs.writeFileSync(ledgerPath, JSON.stringify({ schemaVersion: "1.0.0", releases: [] }, null, 2) + "\n");
}
function saturateFixtureInventory() {
  const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
  const variants = ["know", "gather", "mistakes", "prepare"];
  const answers = [];
  let n = 0;
  for (const route of manifest.routes || []) {
    if (route.type !== "public" || !route.index || route.path === "/" || route.risk !== "low") continue;
    for (const variant of variants) {
      n += 1;
      answers.push({
        id: `fixture-saturated-${n}`,
        title: `Fixture saturated ${n}`,
        slug: `fixture-saturated-${n}`,
        route: route.path,
        riskLevel: "low",
        status: "published_by_contract",
        contentKey: `${route.path}::${variant}`,
        contentHash: `fixture-${n}`,
        publishedAt: "2099-12-29T00:00:00.000Z",
        steps: ["one", "two", "three"],
        checklist: ["one", "two", "three"]
      });
    }
  }
  fs.writeFileSync(generatedPath, JSON.stringify({ schemaVersion: "2.1.0", generatedAt: "2099-12-29T00:00:00.000Z", answers }, null, 2) + "\n");
  fs.writeFileSync(ledgerPath, JSON.stringify({ schemaVersion: "1.0.0", releases: [] }, null, 2) + "\n");
  return answers.length;
}

try {
  // Positive-path fixture is isolated from production cumulative state.
  resetFixtureState();
  const positiveDate = "2099-12-31";
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: positiveDate, CONTENT_RELEASE_LIMIT: "3" });
  run("scripts/content/self-heal.mjs");
  const afterFirst = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  const added = afterFirst.answers.filter((item) => item.releaseId === `content-release-${positiveDate}`);
  if (afterFirst.schemaVersion !== "2.1.0") fail("[content-release] generated answers schema mismatch");
  if (added.length < 1 || added.length > 3) fail(`[content-release] isolated fixture expected 1-3 low-risk pages, found ${added.length}`);
  if (!added.every((item) => item.riskLevel === "low" && item.status === "published_by_contract")) fail("[content-release] non-low-risk content escaped fixture release");
  if (!added.every((item) => item.slug && item.contentHash && item.contentKey && item.publishedAt && item.steps?.length >= 3 && item.checklist?.length >= 3)) fail("[content-release] released answer missing structured publication fields");
  for (const field of ["id", "title", "slug", "contentKey", "contentHash"]) assertUnique(afterFirst.answers, field);
  const countAfterFirst = afterFirst.answers.length;
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: positiveDate, CONTENT_RELEASE_LIMIT: "3" });
  const afterSecond = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  if (afterSecond.answers.length !== countAfterFirst) fail("[content-release] same-day rerun was not idempotent");
  let ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  let releaseRows = (ledger.releases || []).filter((item) => item.id === `content-release-${positiveDate}`);
  if (releaseRows.length !== 1) fail(`[content-release] expected one idempotent fixture ledger row, found ${releaseRows.length}`);

  // Inventory exhaustion is a valid Safe Harbor NOOP, not a release failure.
  const saturatedCount = saturateFixtureInventory();
  const noopDate = "2099-12-30";
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: noopDate, CONTENT_RELEASE_LIMIT: "3" });
  const exhausted = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  const noopAdded = exhausted.answers.filter((item) => item.releaseId === `content-release-${noopDate}`);
  if (noopAdded.length !== 0) fail(`[content-release] saturated fixture unexpectedly published ${noopAdded.length} pages`);
  ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  releaseRows = (ledger.releases || []).filter((item) => item.id === `content-release-${noopDate}`);
  if (releaseRows.length !== 1) fail(`[content-release] expected one inventory-exhaustion ledger row, found ${releaseRows.length}`);
  if (releaseRows[0].status !== "no_distinct_low_risk_inventory" || releaseRows[0].pagesPublished !== 0) fail("[content-release] inventory exhaustion did not resolve to governed NOOP");

  console.log(`[content-release] OK fixtureAdded=${added.length} idempotent=true saturatedInventory=${saturatedCount} exhaustion=NOOP`);
} finally {
  restore();
}
