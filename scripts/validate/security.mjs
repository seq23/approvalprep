#!/usr/bin/env node
import fs from "node:fs";
import { walk, fail } from "./_common.mjs";
const secretPatterns = [/sk_live_[a-z0-9]/i, /rk_live_[a-z0-9]/i, /re_[a-z0-9]{20,}/i];

const forbiddenFiles = [".env", ".env.local", ".env.production", ".dev.vars", ".dev.vars.local", ".ops/vault.enc", "deployment/setup-state.json"];
for (const file of forbiddenFiles) {
  if (fs.existsSync(file)) fail(`[security] forbidden local secret/state file present: ${file}`);
}
for (const file of walk(".").filter((f) => /(^|\/)vault\.(json|dec\.json|local\.json)$/.test(f) || /\.passphrase\.txt$/.test(f) || /approvalprep-cloudflare-ops-bundle/.test(f))) {
  fail(`[security] forbidden private ops artifact present: ${file}`);
}
const unsafe = ["guaranteed deletion", "guaranteed score increase", "we contact bureaus for you", "we dispute for you", "remove accurate negative items", "fake paystubs"];
for (const file of walk(".").filter((f) => /\.(md|json|astro|ts|mjs|txt|example)$/.test(f) && !f.includes("node_modules") && !f.includes("dist") && !f.includes("/scripts/validate/"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of secretPatterns) if (pattern.test(text)) fail("[security] possible secret in " + file);
  const lower = text.toLowerCase();
  for (const phrase of unsafe) {
    const idx = lower.indexOf(phrase);
    if (idx === -1) continue;
    const context = lower.slice(Math.max(0, idx - 500), idx + phrase.length + 100);
    const negated = context.includes("blocked") || context.includes("does not") || context.includes("do not") || context.includes("no ");
    if (!negated) fail("[security] unsafe phrase without blocked context: " + phrase + " in " + file);
  }
}
console.log("[security] OK");
