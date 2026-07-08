#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fail } from "./_common.mjs";
import { validateVaultSchema } from "../ops/lib/vault-schema.mjs";
const file = ".ops/vault.example.json";
if (!fs.existsSync(file)) fail("[vault-schema] missing .ops/vault.example.json");
try {
  const vault = JSON.parse(fs.readFileSync(file, "utf8"));
  validateVaultSchema(vault, { real: false });
} catch (err) {
  fail(`[vault-schema] ${err.message}`);
}
const vaultEncPath = ".ops/vault.enc";

function git(args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

if (fs.existsSync(vaultEncPath)) {
  const tracked = git(["ls-files", "--error-unmatch", vaultEncPath]);
  if (tracked.status === 0) {
    fail("[vault-schema] .ops/vault.enc is tracked by git and must never be committed");
  }

  const staged = git(["diff", "--cached", "--name-only", "--", vaultEncPath]);
  if ((staged.stdout || "").split(/\r?\n/).includes(vaultEncPath)) {
    fail("[vault-schema] .ops/vault.enc is staged and must never be committed");
  }

  const ignored = git(["check-ignore", "--quiet", vaultEncPath]);
  if (ignored.status !== 0) {
    fail("[vault-schema] .ops/vault.enc exists locally but is not protected by .gitignore");
  }
}
console.log("[vault-schema] OK");
