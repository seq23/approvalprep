#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { root, readJson, exists, fail, walk } from "./_common.mjs";
const required = ["REPO_IDENTITY.md", "REPO_WORK_OS_AUTHORITY.md", "_repo_update_contract.json", "_repo_validation_matrix.json", "data/validation/validator_registry.json", "data/acceptance/acceptance_criteria.json", "data/routes/route_manifest.json", "data/proof/proof_matrix.json", "data/release/release_ledger.json", "docs/ROLLBACK.md", "docs/INITIALIZATION_LOCK.md", "package.json", "astro.config.mjs"];
const missing = required.filter((file) => !exists(file));
if (missing.length) fail("[repo-structure] Missing: " + missing.join(", "));
const pkg = readJson("package.json");
if (pkg.name !== "approvalprep") fail("[repo-structure] package name must be approvalprep");
const hasLock = exists("package-lock.json");
for (const file of walk(".github/workflows").filter((item) => item.endsWith(".yml") || item.endsWith(".yaml"))) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("npm ci") && !hasLock) fail("[repo-structure] workflow uses npm ci without package-lock.json: " + file);
}
console.log("[repo-structure] OK");
