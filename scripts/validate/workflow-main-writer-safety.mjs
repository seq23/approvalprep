#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workflowDir = ".github/workflows";
const workflowFiles = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/.test(name)).sort();
const writers = [];
const errors = [];
const cronOwners = new Map();

for (const file of workflowFiles) {
  const text = fs.readFileSync(path.join(workflowDir, file), "utf8");
  if (!/git\s+(?:push|add|commit)/.test(text)) continue;
  const writer = {
    workflow: file,
    sharedConcurrency: /group:\s*approvalprep-main-writer\b/.test(text),
    cancelInProgressFalse: /cancel-in-progress:\s*false/.test(text),
    fullCheckout: /fetch-depth:\s*0/.test(text) && /ref:\s*main/.test(text),
    preparesLatestMain: /bash scripts\/workflows\/prepare-main-writer\.sh/.test(text),
    safePush: /bash scripts\/workflows\/safe-push-main\.sh/.test(text),
    directPush: /(^|\n)\s*git push(?:\s|$)/m.test(text)
  };
  writers.push(writer);
  for (const match of text.matchAll(/cron:\s*["']([^"']+)["']/g)) {
    const cron = match[1];
    const owners = cronOwners.get(cron) || [];
    owners.push(file);
    cronOwners.set(cron, owners);
  }
  for (const [key, ok] of Object.entries({
    sharedConcurrency: writer.sharedConcurrency,
    cancelInProgressFalse: writer.cancelInProgressFalse,
    fullCheckout: writer.fullCheckout,
    preparesLatestMain: writer.preparesLatestMain,
    safePush: writer.safePush
  })) if (!ok) errors.push(`${file}:${key}`);
  if (writer.directPush) errors.push(`${file}:direct_git_push`);
}
for (const [cron, owners] of cronOwners) if (owners.length > 1) errors.push(`duplicate_writer_cron:${cron}:${owners.join(",")}`);

for (const helper of ["scripts/workflows/prepare-main-writer.sh", "scripts/workflows/safe-push-main.sh"]) {
  if (!fs.existsSync(helper)) errors.push(`missing_helper:${helper}`);
  else if (!fs.statSync(helper).mode.toString(8).endsWith("755")) {
    // Executability is the real requirement; group/other bits may vary after ZIP extraction.
    try { fs.accessSync(helper, fs.constants.X_OK); } catch { errors.push(`not_executable:${helper}`); }
  }
}
const pushHelper = fs.readFileSync("scripts/workflows/safe-push-main.sh", "utf8");
if (/--force|-f\b/.test(pushHelper)) errors.push("safe_push_helper_contains_force");

function run(command, args, cwd, expected = 0, env = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, ...env } });
  if (expected === 0 && result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  if (expected !== 0 && result.status === 0) throw new Error(`${command} ${args.join(" ")} unexpectedly passed`);
  return result;
}
function git(cwd, ...args) { return run("git", args, cwd); }
function configure(cwd) {
  git(cwd, "config", "user.name", "ApprovalPrep Fixture Bot");
  git(cwd, "config", "user.email", "fixture@example.invalid");
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "approvalprep-main-writer-"));
const origin = path.join(temp, "origin.git");
const seed = path.join(temp, "seed");
const writer = path.join(temp, "writer");
const external = path.join(temp, "external");
const verify = path.join(temp, "verify");
const scenarios = [];
try {
  run("git", ["init", "--bare", origin], temp);
  run("git", ["init", "-b", "main", seed], temp);
  configure(seed);
  fs.writeFileSync(path.join(seed, "README.md"), "baseline\n");
  fs.writeFileSync(path.join(seed, "conflict.txt"), "baseline\n");
  git(seed, "add", "."); git(seed, "commit", "-m", "baseline");
  git(seed, "remote", "add", "origin", origin); git(seed, "push", "-u", "origin", "main");
  git(origin, "symbolic-ref", "HEAD", "refs/heads/main");

  run("git", ["clone", origin, writer], temp); configure(writer);
  run("git", ["clone", origin, external], temp); configure(external);
  run("bash", [path.resolve("scripts/workflows/prepare-main-writer.sh")], writer, 0, { PUSH_RETRY_DELAY_SECONDS: "0" });
  scenarios.push({ id: "latest_main_sync", status: "PASS" });

  fs.writeFileSync(path.join(writer, "writer.txt"), "writer\n");
  git(writer, "add", "writer.txt"); git(writer, "commit", "-m", "writer change");
  fs.writeFileSync(path.join(external, "external.txt"), "external\n");
  git(external, "add", "external.txt"); git(external, "commit", "-m", "external change"); git(external, "push", "origin", "main");
  run("bash", [path.resolve("scripts/workflows/safe-push-main.sh")], writer, 0, { PUSH_RETRY_DELAY_SECONDS: "0" });
  scenarios.push({ id: "remote_advance_rebase_retry", status: "PASS" });

  run("git", ["clone", origin, verify], temp);
  if (!fs.existsSync(path.join(verify, "writer.txt")) || !fs.existsSync(path.join(verify, "external.txt"))) throw new Error("merged remote did not retain both writers");
  scenarios.push({ id: "both_changes_preserved", status: "PASS" });

  run("bash", [path.resolve("scripts/workflows/safe-push-main.sh")], writer, 0, { PUSH_RETRY_DELAY_SECONDS: "0" });
  scenarios.push({ id: "no_change_noop", status: "PASS" });

  const conflictWriter = path.join(temp, "conflict-writer");
  const conflictExternal = path.join(temp, "conflict-external");
  run("git", ["clone", origin, conflictWriter], temp); configure(conflictWriter);
  run("git", ["clone", origin, conflictExternal], temp); configure(conflictExternal);
  fs.writeFileSync(path.join(conflictWriter, "conflict.txt"), "writer conflict\n");
  git(conflictWriter, "add", "conflict.txt"); git(conflictWriter, "commit", "-m", "writer conflict");
  fs.writeFileSync(path.join(conflictExternal, "conflict.txt"), "external conflict\n");
  git(conflictExternal, "add", "conflict.txt"); git(conflictExternal, "commit", "-m", "external conflict"); git(conflictExternal, "push", "origin", "main");
  const conflictResult = run("bash", [path.resolve("scripts/workflows/safe-push-main.sh")], conflictWriter, 42, { PUSH_RETRY_DELAY_SECONDS: "0" });
  if (conflictResult.status !== 42) throw new Error(`expected conflict exit 42, got ${conflictResult.status}`);
  const remoteConflict = run("git", ["--git-dir", origin, "show", "main:conflict.txt"], temp).stdout.trim();
  if (remoteConflict !== "external conflict") throw new Error("conflict path overwrote remote history");
  scenarios.push({ id: "conflict_blocks_without_force", status: "PASS" });
} catch (error) {
  errors.push(`isolated_git_fixture:${error.message}`);
  scenarios.push({ id: "isolated_git_fixture", status: "FAIL", detail: error.message });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: errors.length ? "FAIL" : "PASS",
  writerWorkflowCount: writers.length,
  sharedConcurrencyGroup: "approvalprep-main-writer",
  writers,
  scenarios,
  errors
};
fs.mkdirSync("data/workflow_traces", { recursive: true });
fs.writeFileSync("data/workflow_traces/main_writer_safety.json", JSON.stringify(report, null, 2) + "\n");
if (errors.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(`[workflow-main-writer-safety] OK writers=${writers.length} scenarios=${scenarios.length}`);
