#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fail } from "./_common.mjs";
import { prospectiveUrls, publicationBudget } from "../lib/publication_budget.mjs";
import { isAnswerableRoute } from "../content/answer-eligibility.mjs";

const generatedPath = "data/content/generated_answers.json";
const ledgerPath = "data/release/release_ledger.json";
const generatedBefore = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, "utf8") : null;
const ledgerBefore = fs.readFileSync(ledgerPath, "utf8");
const reportPath = "reports/self-healing-log.json";
const reportBefore = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : null;
// The publication budget is production cumulative state too. This fixture asserts
// release mechanics - schema, idempotency, redirect integrity, inventory
// exhaustion - and none of that is a statement about how much of this week's
// cadence allowance is left. Leaving the real data/cadence/known_urls.json in
// place meant generate-candidate.mjs clamped the fixture to the live remaining
// allowance: on 2026-08-30 scheduled-content-release spent the window at 10:18,
// citation-os-daily ran at 10:40 with remaining=0, the fixture published nothing,
// and self-heal.mjs hard-failed on BLOCKED_EMPTY_ANSWER_CORPUS. The cap was doing
// its job; the fixture was reading it.
const cadenceLedgerPath = "data/cadence/known_urls.json";
const cadenceBefore = fs.existsSync(cadenceLedgerPath) ? fs.readFileSync(cadenceLedgerPath, "utf8") : null;

// The publication freeze is exercised here too, because this is the fixture that
// runs the real generator. Both of its inputs are production files, so they are
// held and restored exactly like the ledger above.
// The route manifest is mutated by the page_intent negative proof below.
const manifestPath = "data/routes/route_manifest.json";
const manifestBefore = fs.readFileSync(manifestPath, "utf8");
const policyPath = "data/cadence/policy.json";
const policyBefore = fs.readFileSync(policyPath, "utf8");
const targetsPath = "data/search_intelligence/target_query_set.json";
const targetsBefore = fs.existsSync(targetsPath) ? fs.readFileSync(targetsPath, "utf8") : null;
function setFreeze(frozen, targets) {
  const policy = JSON.parse(policyBefore);
  policy.new_page_publication = { ...(policy.new_page_publication || {}), frozen, frozen_at: policy.new_page_publication?.frozen_at || "2026-10-09", release_rule: "measured_target_only" };
  fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + "\n");
  fs.mkdirSync("data/search_intelligence", { recursive: true });
  fs.writeFileSync(targetsPath, JSON.stringify({ schema_version: "1.0", targets }, null, 2) + "\n");
}

let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  if (generatedBefore === null) fs.rmSync(generatedPath, { force: true });
  else fs.writeFileSync(generatedPath, generatedBefore);
  fs.writeFileSync(ledgerPath, ledgerBefore);
  if (reportBefore === null) fs.rmSync(reportPath, { force: true });
  else fs.writeFileSync(reportPath, reportBefore);
  if (cadenceBefore === null) fs.rmSync(cadenceLedgerPath, { force: true });
  else fs.writeFileSync(cadenceLedgerPath, cadenceBefore);
  fs.writeFileSync(policyPath, policyBefore);
  fs.writeFileSync(manifestPath, manifestBefore);
  if (targetsBefore === null) fs.rmSync(targetsPath, { force: true });
  else fs.writeFileSync(targetsPath, targetsBefore);
}
// fail() is process.exit(1), which does not run a `finally`. Every failing run of
// this validator therefore used to leave production data/content/generated_answers.json
// and data/release/release_ledger.json sitting at their fixture values - a 2,490-line
// corpus replaced by an empty one, in a repo whose workflows commit that path.
process.on("exit", restore);

/**
 * Give the fixture its own cadence baseline: an accepted ledger holding exactly
 * the URL set that exists right now, with an empty trailing window. alreadyNew
 * and spentInWindow are then both 0, so the remaining allowance is the declared
 * cap. The clamp still runs and is still measured - it is measured against
 * fixture state, like every other input to this fixture.
 */
function isolateCadenceLedger(label) {
  fs.mkdirSync("data/cadence", { recursive: true });
  fs.writeFileSync(cadenceLedgerPath, JSON.stringify({
    generated_at: "2099-12-28",
    accepted_reason: `validate:content-release fixture isolation (${label}): fixture cadence baseline, never a published state`,
    history: [],
    urls: [...prospectiveUrls()].sort(),
  }, null, 2) + "\n");
  const budget = publicationBudget();
  // Zero-item rule: if the isolation silently failed to free any allowance the
  // fixture would publish nothing and assert nothing. Say so instead of passing.
  if (!(budget.remaining >= 1)) {
    fail(`[content-release] fixture cadence isolation (${label}) did not free any publication allowance: ${JSON.stringify(budget)}`);
  }
  return budget;
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
  // Release mechanics are measured with the freeze off; the freeze has its own
  // passes below, which run against the same generator.
  setFreeze(false, []);
  const positiveBudget = isolateCadenceLedger("positive-path");
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

  // Publication freeze, frozen with no measured target: nothing publishes and the
  // ledger names the stop. Frozen with the first candidate's query measured:
  // exactly that page publishes. The second pass is the negative proof that the
  // first is not vacuous.
  const firstTitle = added[0]?.title;
  resetFixtureState();
  setFreeze(true, []);
  isolateCadenceLedger("freeze-unmeasured");
  const frozenDate = "2099-12-27";
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: frozenDate, CONTENT_RELEASE_LIMIT: "3" });
  const frozenAdded = JSON.parse(fs.readFileSync(generatedPath, "utf8")).answers.filter((item) => item.releaseId === `content-release-${frozenDate}`);
  const frozenRow = (JSON.parse(fs.readFileSync(ledgerPath, "utf8")).releases || []).find((item) => item.id === `content-release-${frozenDate}`);
  if (frozenAdded.length !== 0) fail(`[content-release] publication freeze: ${frozenAdded.length} unmeasured page(s) published while frozen`);
  if (frozenRow?.status !== "publication_frozen_unmeasured_demand" || !(frozenRow?.publicationFreeze?.heldCount > 0)) fail(`[content-release] publication freeze: ledger row did not name the freeze stop: ${JSON.stringify(frozenRow)}`);
  resetFixtureState();
  setFreeze(true, [{ query: firstTitle, source: "gsc_search_analytics", measurement: { metric: "impressions_28d", value: 1 } }]);
  isolateCadenceLedger("freeze-measured");
  const measuredDate = "2099-12-26";
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: measuredDate, CONTENT_RELEASE_LIMIT: "3" });
  const measuredAdded = JSON.parse(fs.readFileSync(generatedPath, "utf8")).answers.filter((item) => item.releaseId === `content-release-${measuredDate}`);
  if (measuredAdded.length !== 1 || measuredAdded[0].title !== firstTitle) fail(`[content-release] publication freeze: a measured query did not release exactly its own page (got ${JSON.stringify(measuredAdded.map((a) => a.title))})`);
  setFreeze(false, []);

  // Every answerable low-risk route is a hub that absorbed its answers
  // (foldedIntoHub). On 27 Oct 2026 this shared the page_intent hard failure and
  // the scheduled release went red with nothing broken. It must be the named stop
  // NO_ELIGIBLE_ANSWER_ROUTES: exit 0, nothing published, the stop in the log and
  // in the ledger row.
  resetFixtureState();
  const answerableLow = JSON.parse(manifestBefore).routes.filter((route) => route.type === "public" && route.index && route.path !== "/" && route.risk === "low" && isAnswerableRoute(route));
  if (!answerableLow.length) fail("[content-release] folded-hub fixture found zero answerable low-risk routes to fold");
  fs.writeFileSync(generatedPath, JSON.stringify({ schemaVersion: "2.1.0", generatedAt: "2099-12-25T00:00:00.000Z", answers: answerableLow.map((route, i) => ({
    id: `fixture-folded-${i}`, title: `Fixture folded ${i}`, slug: `fixture-folded-${i}`, route: route.path, riskLevel: "low",
    status: "redirected_to_canonical", foldedIntoHub: true, redirectTarget: route.path, contentKey: `${route.path}::fixture`, contentHash: `fixture-folded-${i}`,
  })) }, null, 2) + "\n");
  isolateCadenceLedger("folded-hubs");
  const foldedDate = "2099-12-25";
  const foldedOut = run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: foldedDate, CONTENT_RELEASE_LIMIT: "3" });
  const foldedAdded = JSON.parse(fs.readFileSync(generatedPath, "utf8")).answers.filter((item) => item.releaseId === `content-release-${foldedDate}`);
  const foldedRow = (JSON.parse(fs.readFileSync(ledgerPath, "utf8")).releases || []).find((item) => item.id === `content-release-${foldedDate}`);
  if (foldedAdded.length !== 0) fail(`[content-release] folded hubs: ${foldedAdded.length} answer(s) grew on a hub that absorbed its own`);
  if (!foldedOut.includes("NAMED STOP NO_ELIGIBLE_ANSWER_ROUTES")) fail("[content-release] folded hubs: the run did not print the NO_ELIGIBLE_ANSWER_ROUTES named stop");
  if (foldedRow?.status !== "no_eligible_answer_routes" || foldedRow?.eligibilityStop?.foldedHubs !== answerableLow.length) fail(`[content-release] folded hubs: ledger row did not name the stop: ${JSON.stringify(foldedRow)}`);

  // Negative proof that the stop above did not swallow the guard it split from:
  // a manifest with no page_intent values is a broken input and must still fail.
  resetFixtureState();
  const stripped = JSON.parse(manifestBefore);
  for (const route of stripped.routes) delete route.page_intent;
  fs.writeFileSync(manifestPath, JSON.stringify(stripped, null, 2) + "\n");
  isolateCadenceLedger("no-page-intent");
  const broken = spawnSync(process.execPath, ["scripts/content/generate-candidate.mjs"], { stdio: "pipe", encoding: "utf8", env: { ...process.env, CONTENT_RELEASE_DATE: "2099-12-24", CONTENT_RELEASE_LIMIT: "3" } });
  fs.writeFileSync(manifestPath, manifestBefore);
  if (broken.status === 0 || !String(broken.stderr).includes("no answerable route survived page_intent eligibility")) fail(`[content-release] a manifest with no page_intent did not hard-fail (exit ${broken.status})`);

  // Inventory exhaustion is a valid Safe Harbor NOOP, not a release failure.
  const saturatedCount = saturateFixtureInventory();
  isolateCadenceLedger("inventory-exhaustion");
  const noopDate = "2099-12-30";
  run("scripts/content/generate-candidate.mjs", { CONTENT_RELEASE_DATE: noopDate, CONTENT_RELEASE_LIMIT: "3" });
  const exhausted = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  const noopAdded = exhausted.answers.filter((item) => item.releaseId === `content-release-${noopDate}`);
  if (noopAdded.length !== 0) fail(`[content-release] saturated fixture unexpectedly published ${noopAdded.length} pages`);
  ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  releaseRows = (ledger.releases || []).filter((item) => item.id === `content-release-${noopDate}`);
  if (releaseRows.length !== 1) fail(`[content-release] expected one inventory-exhaustion ledger row, found ${releaseRows.length}`);
  if (releaseRows[0].status !== "no_distinct_low_risk_inventory" || releaseRows[0].pagesPublished !== 0) fail("[content-release] inventory exhaustion did not resolve to governed NOOP");

  if (added.length < 1) fail("[content-release] fixture inspected zero published answers");
  console.log(`[content-release] OK fixtureAdded=${added.length} freezeHeld=${frozenRow.publicationFreeze.heldCount} freezeReleasedMeasured=1 idempotent=true saturatedInventory=${saturatedCount} exhaustion=NOOP foldedHubsStop=${answerableLow.length} noPageIntent=FAIL cadenceIsolated=true fixtureRemainingAllowance=${positiveBudget.remaining}`);
} finally {
  restore();
}
