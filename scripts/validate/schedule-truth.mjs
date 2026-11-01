#!/usr/bin/env node
// docs/SCHEDULE.md must be the truth about what fires, and two retired jobs must stay retired.
//
// 1. Every workflow with a live `- cron:` line appears in the docs/SCHEDULE.md table with that exact
//    cron, every table row names a workflow that really fires on that cron, and every live cron
//    carries `timezone: America/Chicago`. (Until 1 Nov 2026 the table listed Citation OS Daily as
//    "every day" although its cron had been commented out since 8 Oct.)
// 2. weekly-growth-ops.yml and growth-health-refresh.yml were retired from the schedule on
//    1 Nov 2026 because they produced no real output (a dry run whose output was thrown away; fixed
//    panel scores saved nowhere). They keep workflow_dispatch and the retirement comment, and must
//    not regain a schedule without real output.
// 3. The Spry Labs weekly hand-off runs on Wednesday, self-checks, and uploads `spry-weekly-summary`.
//
// Rule 0: zero scheduled workflows or zero table rows is a failure, never a pass.
//   node scripts/validate/schedule-truth.mjs [--self-test]
import fs from "node:fs";
import path from "node:path";

const RETIRED = ["weekly-growth-ops.yml", "growth-health-refresh.yml"];

/** Live crons per workflow file: [{ file, cron, tz }]. Commented lines do not count. */
export function liveCrons(files) {
  const out = [];
  for (const [file, text] of Object.entries(files)) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const m = /^\s*-\s*cron:\s*["']([^"']+)["']/.exec(line);
      if (!m) return;
      const tz = /^\s*timezone:\s*(\S+)/.exec(lines[i + 1] ?? "")?.[1] ?? null;
      out.push({ file, cron: m[1], tz });
    });
  }
  return out;
}

/** Table rows of docs/SCHEDULE.md: [{ file, cron }]. */
export function tableRows(doc) {
  return doc.split("\n").map((l) => /^\|[^|]*\|\s*`([^`]+\.ya?ml)`\s*\|[^|]*\|\s*`([^`]+)`\s*\|\s*$/.exec(l)).filter(Boolean).map((m) => ({ file: m[1], cron: m[2] }));
}

export function problems(files, doc) {
  const out = [];
  const crons = liveCrons(files);
  const rows = tableRows(doc);
  if (!crons.length) out.push("no workflow has a live cron: the scan saw nothing (rule 0)");
  if (!rows.length) out.push("docs/SCHEDULE.md has no table rows: the scan saw nothing (rule 0)");
  for (const c of crons) {
    if (c.tz !== "America/Chicago") out.push(`${c.file}: cron "${c.cron}" has no timezone: America/Chicago`);
    if (!rows.some((r) => r.file === c.file && r.cron === c.cron)) out.push(`${c.file}: cron "${c.cron}" fires but docs/SCHEDULE.md does not list it`);
  }
  for (const r of rows) if (!crons.some((c) => c.file === r.file && c.cron === r.cron)) out.push(`docs/SCHEDULE.md lists ${r.file} at "${r.cron}" but that cron does not fire`);
  for (const f of RETIRED) {
    const t = files[f];
    if (t == null) { out.push(`${f} is missing; it is retired from the schedule, not deleted`); continue; }
    if (/^\s*schedule:/m.test(t)) out.push(`${f} has a schedule again; it was retired 1 Nov 2026 for producing no real output`);
    if (!/^\s*workflow_dispatch:/m.test(t)) out.push(`${f} lost workflow_dispatch; it stays runnable by hand`);
    if (!/retired 1 Nov 2026: produced no real output/.test(t)) out.push(`${f} lost its retirement comment`);
  }
  const s = files["spry-weekly-summary.yml"];
  if (!s) out.push("spry-weekly-summary.yml is missing: ApprovalPrep would have no section in the Spry Labs weekly");
  else {
    if (!crons.some((c) => c.file === "spry-weekly-summary.yml" && /\s3$/.test(c.cron))) out.push("spry-weekly-summary.yml does not run on Wednesday");
    if (!/spry-weekly-summary\.mjs --self-check/.test(s)) out.push("spry-weekly-summary.yml does not self-check the summary");
    if (!/name:\s*spry-weekly-summary\s*\n/.test(s) || !/if-no-files-found:\s*error/.test(s)) out.push("spry-weekly-summary.yml does not upload the artifact spry-weekly-summary (failing when missing)");
  }
  return out;
}

function selfTest() {
  const wf = (cron, tz = true) => `on:\n  schedule:\n    - cron: "${cron}"\n${tz ? "      timezone: America/Chicago\n" : ""}  workflow_dispatch:\n`;
  const retired = "on:\n  # retired 1 Nov 2026: produced no real output\n  workflow_dispatch:\n";
  const spry = `${wf("48 7 * * 3")}jobs:\n  s:\n    steps:\n      - run: node scripts/spry/spry-weekly-summary.mjs --self-check\n      - with:\n          name: spry-weekly-summary\n          if-no-files-found: error\n`;
  const good = { "a.yml": wf("0 4 * * 6"), "weekly-growth-ops.yml": retired, "growth-health-refresh.yml": retired, "spry-weekly-summary.yml": spry };
  const doc = "| A | `a.yml` | Sat | `0 4 * * 6` |\n| S | `spry-weekly-summary.yml` | Wed | `48 7 * * 3` |\n";
  const cases = [
    ["clean", good, doc, 0],
    ["retired job rescheduled", { ...good, "weekly-growth-ops.yml": wf("40 4 * * 6") }, doc, 1],
    ["row for a cron that does not fire", good, `${doc}| C | \`c.yml\` | daily | \`37 10 * * *\` |\n`, 1],
    ["cron missing from the table", { ...good, "b.yml": wf("5 6 * * *") }, doc, 1],
    ["no timezone", { ...good, "a.yml": wf("0 4 * * 6", false) }, doc, 1],
    ["commented cron is not live", { ...good, "c.yml": 'on:\n  #   - cron: "37 10 * * *"\n' }, doc, 0],
    ["nothing seen", {}, "", 1],
  ];
  for (const [name, files, d, want] of cases) {
    const got = problems(files, d).length;
    if ((got === 0) !== (want === 0)) throw new Error(`self-test "${name}": expected ${want ? "problems" : "none"}, got ${got}`);
  }
  console.log(`[validate:schedule-truth] self-test ok (${cases.length} cases)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfTest();
  if (!process.argv.includes("--self-test")) {
    const dir = ".github/workflows";
    const files = Object.fromEntries(fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));
    const found = problems(files, fs.readFileSync("docs/SCHEDULE.md", "utf8"));
    if (found.length) {
      console.error(found.map((p) => `[validate:schedule-truth] ${p}`).join("\n"));
      process.exit(1);
    }
    console.log(`[validate:schedule-truth] OK ${liveCrons(files).length} live crons, each in docs/SCHEDULE.md; ${RETIRED.length} retired jobs unscheduled; Spry weekly hand-off wired`);
  }
}
