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

// A publishing workflow is one that commits public/sitemap.xml back to main.
// That is the definition on purpose, and it is the one thing this guard used to
// get wrong: it identified publishers as workflows that ALREADY ran the cadence
// gate and committed. A workflow that publishes without the gate was therefore
// invisible to the guard whose whole job is to notice exactly that - the check
// could only see the workflows that had already opted in.
//
// citation-os-daily.yml is what that cost. It runs content:generate,
// content:generate-pages and seo:sitemap and commits public/sitemap.xml to main,
// so it publishes as surely as scheduled-content-release.yml does, and it did so
// with no cadence gate anywhere in it. On 2026-08-28 it shipped four new URLs
// against a cap of two; the ledger never moved, and scheduled-content-release
// went red the next morning for pages a different workflow had published.
//
// The published URL set is the thing being governed, and public/sitemap.xml is
// the record of it, so committing that file is what makes a workflow a
// publisher. validate.yml runs the gate and commits nothing, so it stays exempt.
const publishers = [];
const accepters = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(workflowDir, file), "utf8");
  // Ordering is a property of the steps, not of the prose around them. Comment
  // lines are blanked rather than dropped so offsets still line up with the file.
  const text = raw.replace(/^\s*#.*$/gm, (line) => " ".repeat(line.length));
  const pushes = /git\s+commit/.test(text) || /safe-push-main\.sh/.test(text);
  const publishesSitemap = /git\s+add[^\n]*public\/sitemap\.xml/.test(text);
  if (!pushes || !publishesSitemap) continue;

  const acceptAt = text.search(/cadence:gate\s+--\s+--accept\b/);
  const checkAt = text.search(/run:\s*npm run cadence:gate\s*$/m);
  const commitAt = text.search(/git\s+add\b/);
  publishers.push({ workflow: file, acceptAt, checkAt, commitAt });

  // Every publisher must be measured. Without this the cap governs one of the
  // three workflows that can change the published URL set.
  if (checkAt === -1) {
    errors.push(
      `${file}: commits public/sitemap.xml to main but never runs \`npm run cadence:gate\`. ` +
      `The publication cap in data/cadence/policy.json is enforced nowhere else, so this ` +
      `workflow can publish past it and the failure surfaces in whichever workflow does run the gate.`,
    );
  } else if (commitAt !== -1 && checkAt > commitAt) {
    errors.push(`${file}: the blocking cadence gate runs after the commit step, so an over-cap release is already staged by the time it is measured.`);
  }

  if (acceptAt === -1) continue;
  accepters.push(file);
  if (!/--accept[\s\S]{0,400}?--reason/.test(text)) {
    errors.push(`${file}: --accept is used without --reason; the ledger must record a decision, not a re-run.`);
  }
  if (checkAt !== -1 && acceptAt < checkAt) {
    errors.push(`${file}: the --accept step runs before the blocking cadence gate, so an over-cap release would record itself as accepted.`);
  }
  if (commitAt !== -1 && acceptAt > commitAt) {
    errors.push(`${file}: the --accept step runs after \`git add\`, so the advanced ledger is never committed.`);
  }
}
if (!publishers.length) {
  errors.push("no workflow commits public/sitemap.xml to main, so nothing publishes and nothing advances data/cadence/known_urls.json.");
} else if (!accepters.length) {
  errors.push(
    "no publishing workflow runs `npm run cadence:gate -- --accept`. Nothing else writes " +
    "data/cadence/known_urls.json, so the baseline freezes and the weekly cap turns into a " +
    "ratchet that blocks every publisher permanently.",
  );
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

/* ---------- part 2b: the weekly cap actually measures a week ---------- */

// `--accept` runs at the end of every clear scheduled-content-release, and that
// workflow is on `cron: "7 10 * * *"`. Comparing "new since the last accept" to
// a per-WEEK cap therefore handed out a full weekly allowance every morning.
// Measured before the fix: seven synthetic daily accepts of two URLs each
// published fourteen URLs against a cap of two, and the gate never blocked.
//
// The rolling window is what makes the week real. This drives the real gate
// through seven simulated days with a simulated clock, which is the only way to
// prove both that it closes and - just as important - that it REOPENS. A window
// that never reopens is a lane pinned at zero wearing a better name.
const windowTemp = fs.mkdtempSync(path.join(os.tmpdir(), "approvalprep-cadence-window-"));
try {
  fs.mkdirSync(path.join(windowTemp, "data/cadence"), { recursive: true });
  fs.copyFileSync(path.join(root, "scripts/cadence_gate.cjs"), path.join(windowTemp, "cadence_gate.cjs"));
  fs.mkdirSync(path.join(windowTemp, "lib"), { recursive: true });
  fs.copyFileSync(path.join(root, "scripts/lib/cadence_window.cjs"), path.join(windowTemp, "lib/cadence_window.cjs"));
  fs.writeFileSync(path.join(windowTemp, "data/cadence/policy.json"), JSON.stringify({
    new_pages_per_week: 2, new_pages_window_days: 7, require_lastmod: true,
    stale_tolerance_pct: 100, refresh_window_days: 91, refresh_capacity_per_week: 8,
  }));

  const day = (n) => `2026-09-${String(n).padStart(2, "0")}`;
  const writeSitemap = (count, date) => fs.writeFileSync(path.join(windowTemp, "sitemap.xml"),
    `<?xml version="1.0"?><urlset>${Array.from({ length: count }, (_, i) =>
      `<url><loc>https://x.test/p${i + 1}</loc><lastmod>${date}</lastmod></url>`).join("")}</urlset>`);
  const gate = (date, extra = []) => spawnSync("node", ["cadence_gate.cjs", ...extra],
    { cwd: windowTemp, encoding: "utf8", env: { ...process.env, CADENCE_TODAY: date } });

  // Seed a baseline on day 1 so the cap has something to measure against.
  writeSitemap(1, day(1));
  gate(day(1), ["--accept", "--reason", "fixture baseline"]);

  // Days 2 and 3 spend the cap of 2, one URL each, each accepted.
  let total = 1, blockedOn = null;
  for (let d = 2; d <= 8 && blockedOn === null; d += 1) {
    total += 1;
    writeSitemap(total, day(d));
    const run = gate(day(d));
    if (run.status !== 0) { blockedOn = d; break; }
    gate(day(d), ["--accept", "--reason", `fixture day ${d}`]);
  }
  scenario("weekly_cap_blocks_inside_the_window", blockedOn !== null && blockedOn <= 5,
    `publishing one URL a day against a cap of 2 per 7 days should have blocked by day 5; it blocked on ${blockedOn === null ? "no day at all - the window is not being measured" : `day ${blockedOn}`}`);

  // ...and the same tree, unchanged, must clear once the window rolls past the
  // spend. A gate that blocks forever is not a rolling window.
  const reopened = gate(day(20));
  scenario("weekly_cap_reopens_when_the_window_rolls", reopened.status === 0,
    `the identical tree still blocked on ${day(20)}, well past the 7-day window; the cap is pinned rather than rolling`);

  // A re-run must never be able to shrink the window. Two accepts on one day sum.
  const before = JSON.parse(fs.readFileSync(path.join(windowTemp, "data/cadence/known_urls.json"), "utf8"));
  gate(day(4), ["--accept", "--reason", "fixture re-run"]);
  const after = JSON.parse(fs.readFileSync(path.join(windowTemp, "data/cadence/known_urls.json"), "utf8"));
  scenario("accept_history_is_append_only", Array.isArray(after.history) && after.history.length >= (before.history || []).length,
    "a repeated --accept shrank or erased the ledger history; a re-run must not be able to hand back spent allowance");
} catch (error) {
  scenario("cadence_window_fixture", false, error.message);
} finally {
  fs.rmSync(windowTemp, { recursive: true, force: true });
}

/* ---------- part 3: the publishers are clamped to the enforced cap ---------- */

// Gating every publisher stops an over-cap release from shipping. It does not
// stop one from being generated - it just turns the overage into a red run
// instead of a bad publish. scripts/lib/publication_budget.mjs is what keeps the
// generators inside the cap in the first place, by deriving their limit from
// data/cadence/policy.json rather than from one of the four private ceilings
// that used to each hold their own copy of the number. Exercised for real, in a
// temp tree, so a rewrite that quietly stops consulting the policy is caught.
const budgetModule = path.join(root, "scripts/lib/publication_budget.mjs");
const budgetTemp = fs.mkdtempSync(path.join(os.tmpdir(), "approvalprep-publication-budget-"));
try {
  const write = (rel, value) => {
    fs.mkdirSync(path.join(budgetTemp, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(budgetTemp, rel), JSON.stringify(value));
  };
  const routes = ["/a", "/b", "/c", "/d"];
  write("data/routes/route_manifest.json", { routes: routes.map((p) => ({ path: p, index: true, type: "public" })) });
  write("data/content/generated_answers.json", { answers: [] });
  write("data/reports/public_report_registry.json", { reports: [] });
  write("data/cadence/policy.json", { new_pages_per_week: 2 });

  const ask = () => {
    const result = spawnSync(
      "node",
      ["--input-type=module", "-e", `import { publicationBudget } from ${JSON.stringify(budgetModule)}; console.log(JSON.stringify(publicationBudget()));`],
      { cwd: budgetTemp, encoding: "utf8" },
    );
    if (result.status !== 0) throw new Error(`publication_budget failed: ${result.stderr}`);
    return JSON.parse(result.stdout.trim().split("\n").pop());
  };

  // Baseline knows every route: the full cap is available.
  write("data/cadence/known_urls.json", { urls: routes.map((p) => `https://approvalprep.com${p}/`) });
  const clear = ask();
  scenario("budget_is_full_cap_when_nothing_is_new", clear.remaining === 2,
    `expected 2 of a cap of 2 to remain when no URL is new, got ${JSON.stringify(clear)}`);

  // Three routes already published past the baseline: no headroom at all, and it
  // must clamp at zero rather than going negative.
  write("data/cadence/known_urls.json", { urls: ["https://approvalprep.com/a/"] });
  const spent = ask();
  scenario("budget_is_zero_when_the_cap_is_already_spent", spent.alreadyNew === 3 && spent.remaining === 0,
    `expected 3 new URLs to leave 0 of a cap of 2, got ${JSON.stringify(spent)}`);

  // Partly spent: the remainder is arithmetic, not a fresh allowance.
  write("data/cadence/known_urls.json", { urls: ["https://approvalprep.com/a/", "https://approvalprep.com/b/", "https://approvalprep.com/c/"] });
  const partial = ask();
  scenario("budget_is_the_remainder_not_the_cap", partial.remaining === 1,
    `expected 1 of a cap of 2 to remain with one URL already new, got ${JSON.stringify(partial)}`);

  // No accepted baseline means the gate cannot block, so the budget imposes
  // nothing and the generators keep their own ceilings.
  fs.rmSync(path.join(budgetTemp, "data/cadence/known_urls.json"));
  const unledgered = ask();
  scenario("budget_is_unconstrained_without_a_baseline", unledgered.remaining === null,
    `expected no constraint without a ledger, got ${JSON.stringify(unledgered)}`);
} catch (error) {
  scenario("publication_budget_fixture", false, error.message);
} finally {
  fs.rmSync(budgetTemp, { recursive: true, force: true });
}

// The generators have to actually ask. A limit that is computed and then not
// applied is the same defect in a new place.
for (const generator of ["scripts/content/generate-candidate.mjs", "scripts/content/generate-page-candidates.mjs"]) {
  const src = fs.readFileSync(path.join(root, generator), "utf8");
  scenario(`${path.basename(generator)}_consults_the_publication_budget`,
    /clampToPublicationBudget\s*\(/.test(src) && /publication_budget\.mjs/.test(src),
    `${generator} publishes new indexable URLs without clamping to scripts/lib/publication_budget.mjs, so its private ceiling can exceed data/cadence/policy.json again`);
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
