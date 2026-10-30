#!/usr/bin/env node
// Proves the weekly entity watch (scripts/ops/entity-backlink-watch.mjs) does what
// it says, offline, on every PR - and that something actually schedules it.
//
// A self-healing job nobody can watch fail is a wish. This runs the watch
// against fixture responses on a scratch copy of entity.json and asserts each
// self-heal and each named state, then checks the workflow runs it weekly with
// --apply and commits through the safe main-writer path. Hard-fails on zero
// scenarios.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail } from "./_common.mjs";

const NAME = "entity-backlink-watch";
const SCRIPT = "scripts/ops/entity-backlink-watch.mjs";
const WORKFLOW = ".github/workflows/entity-backlink-watch.yml";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "entity-watch-"));
const SITE = "https://approvalprep.com/";
const LINKS = `<a href="https://approvalprep.com/">approvalprep.com</a>`;

function run(entity, fixture, extra = []) {
  const entityFile = path.join(tmp, `entity-${Math.random().toString(36).slice(2)}.json`);
  const fixtureFile = path.join(tmp, `fixture-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(entityFile, JSON.stringify({ "@id": `${SITE}#organization`, url: SITE, ...entity }));
  fs.writeFileSync(fixtureFile, JSON.stringify(fixture));
  const result = spawnSync(process.execPath, [SCRIPT, "--fixture", fixtureFile, ...extra], { encoding: "utf8", env: { ...process.env, ENTITY_FILE: entityFile, GITHUB_STEP_SUMMARY: "" } });
  return { status: result.status, out: `${result.stdout}${result.stderr}`, entity: JSON.parse(fs.readFileSync(entityFile, "utf8")) };
}

const P = "https://www.pinterest.com/approvalprep/";
const F = "https://www.facebook.com/approvalprep";
const IG = "https://www.instagram.com/approvalprep/";
const LI = "https://www.linkedin.com/company/approvalprep/";
const scenarios = [
  ["a dead sameAs is removed and parked in profiles_pending", () => {
    const r = run({ sameAs: [P, F], profiles_pending: [] }, { [P]: { status: 200, body: LINKS }, [F]: { status: 404 } }, ["--apply"]);
    return r.status === 0 && JSON.stringify(r.entity.sameAs) === JSON.stringify([P]) && r.entity.profiles_pending.some((p) => p.url === F);
  }],
  ["without --apply nothing is written", () => {
    const r = run({ sameAs: [P, F], profiles_pending: [] }, { [P]: { status: 200, body: LINKS }, [F]: { status: 404 } });
    return r.status === 0 && r.entity.sameAs.length === 2 && /WOULD removed/.test(r.out);
  }],
  ["a pending profile that resolves and links back is promoted", () => {
    const r = run({ sameAs: [P], profiles_pending: [{ platform: "LinkedIn", url: LI }] }, { [P]: { status: 200, body: LINKS }, [LI]: { status: 200, body: LINKS } }, ["--apply"]);
    return r.entity.sameAs.includes(LI) && r.entity.profiles_pending.length === 0;
  }],
  ["a pending profile that resolves WITHOUT a link back is not promoted", () => {
    const r = run({ sameAs: [P], profiles_pending: [{ platform: "LinkedIn", url: LI }] }, { [P]: { status: 200, body: LINKS }, [LI]: { status: 200, body: "someone else's page" } }, ["--apply"]);
    return !r.entity.sameAs.includes(LI) && /NAMED STOP PROFILE_PENDING/.test(r.out);
  }],
  ["a resolving sameAs with no link back is a named stop naming the field", () => {
    const r = run({ sameAs: [P], profiles_pending: [] }, { [P]: { status: 200, body: "no link" } }, ["--apply"]);
    return r.status === 0 && r.entity.sameAs.includes(P) && /NAMED STOP LINK_BACK_MISSING .*Edit profile > Website/.test(r.out);
  }],
  ["a JS-rendered profile is UNVERIFIABLE, never a pass, never removed", () => {
    const r = run({ sameAs: [P, IG], profiles_pending: [] }, { [P]: { status: 200, body: LINKS }, [IG]: { status: 200, body: LINKS } }, ["--apply"]);
    return r.entity.sameAs.includes(IG) && /UNVERIFIABLE\s+sameAs\s+https:\/\/www\.instagram/.test(r.out) && /ok=1 /.test(r.out);
  }],
  ["a network error or a robots refusal never removes a profile", () => {
    const r = run({ sameAs: [P, F], profiles_pending: [] }, { [P]: { status: 999 } }, ["--apply"]);
    return r.entity.sameAs.length === 2 && /dead=0/.test(r.out);
  }],
  ["zero profiles is a failure, not a pass", () => { const r = run({ sameAs: [], profiles_pending: [] }, {}); return r.status === 1 && /lists zero profiles/.test(r.out); }]
];

const failures = [];
for (const [label, check] of scenarios) {
  let ok = false;
  try { ok = check(); } catch (error) { failures.push(`${label}: threw ${error.message}`); continue; }
  if (!ok) failures.push(label);
}
fs.rmSync(tmp, { recursive: true, force: true });
if (scenarios.length === 0) fail(`[${NAME}] FAIL: zero scenarios`);

if (!fs.existsSync(WORKFLOW)) failures.push(`${WORKFLOW} is missing: nothing schedules the watch`);
else {
  const wf = fs.readFileSync(WORKFLOW, "utf8");
  if (!/schedule:\s*\n\s*-\s*cron:/.test(wf)) failures.push(`${WORKFLOW} has no cron schedule`);
  if (!/workflow_dispatch:/.test(wf)) failures.push(`${WORKFLOW} has no workflow_dispatch`);
  if (!/npm run ops:entity-backlink-watch -- --apply/.test(wf)) failures.push(`${WORKFLOW} does not run the watch with --apply`);
  if (!/npm run validate:schema-entity-graph/.test(wf)) failures.push(`${WORKFLOW} commits entity.json without re-running validate:schema-entity-graph`);
  if (!/safe-push-main\.sh/.test(wf)) failures.push(`${WORKFLOW} does not publish through scripts/workflows/safe-push-main.sh`);
}

if (failures.length) fail(`[${NAME}] FAIL: ${failures.length}\n${failures.join("\n")}`);
console.log(`[${NAME}] OK scenarios=${scenarios.length} workflow=${WORKFLOW}`);
