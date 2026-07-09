#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { walk, fail } from "./_common.mjs";
const secretPatterns = [/sk_live_[a-z0-9]/i, /rk_live_[a-z0-9]/i, /re_[a-z0-9]{20,}/i];

const forbiddenFiles = [".env", ".env.local", ".env.production", ".dev.vars", ".dev.vars.local", "deployment/setup-state.json"];
for (const file of forbiddenFiles) {
  if (fs.existsSync(file)) fail(`[security] forbidden local secret/state file present: ${file}`);
}

function git(args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

function assertIgnoredLocalOnly(file) {
  if (!fs.existsSync(file)) return;

  const tracked = git(["ls-files", "--error-unmatch", file]);
  if (tracked.status === 0) {
    fail(`[security] forbidden secret/state file is tracked by git: ${file}`);
  }

  const staged = git(["diff", "--cached", "--name-only", "--", file]);
  if ((staged.stdout || "").split(/\r?\n/).includes(file)) {
    fail(`[security] forbidden secret/state file is staged: ${file}`);
  }

  const ignored = git(["check-ignore", "--quiet", file]);
  if (ignored.status !== 0) {
    fail(`[security] local secret/state file exists but is not protected by .gitignore: ${file}`);
  }
}

assertIgnoredLocalOnly(".ops/vault.enc");
for (const file of walk(".").filter((f) => /(^|\/)vault\.(json|dec\.json|local\.json)$/.test(f) || /\.passphrase\.txt$/.test(f) || /approvalprep-cloudflare-ops-bundle/.test(f))) {
  fail(`[security] forbidden private ops artifact present: ${file}`);
}
const unsafe = ["guaranteed deletion", "guaranteed score increase", "we contact bureaus for you", "we dispute for you", "remove accurate negative items", "fake paystubs"];
for (const file of walk(".").filter((f) => /\.(md|json|astro|ts|mjs|txt|example)$/.test(f) && !f.includes("node_modules") && !f.includes("dist") && !f.includes("/scripts/validate/"))) {
  const isExplicitPolicyBlocklist = file.endsWith("data/governance/publication_policy.json") || file.endsWith("data/compliance/prohibited_claims.json");
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of secretPatterns) if (pattern.test(text)) fail("[security] possible secret in " + file);
  const lower = text.toLowerCase();
  for (const phrase of unsafe) {
    const idx = lower.indexOf(phrase);
    if (idx === -1) continue;
    const context = lower.slice(Math.max(0, idx - 500), idx + phrase.length + 100);
    const negated = context.includes("blocked") || context.includes("does not") || context.includes("do not") || context.includes("no ");
    if (!negated && !isExplicitPolicyBlocklist) fail("[security] unsafe phrase without blocked context: " + phrase + " in " + file);
  }
}
console.log("[security] OK");
