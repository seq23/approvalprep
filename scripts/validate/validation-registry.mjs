#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";

const registry = readJson("_repo_validation_registry.json");
const dataRegistry = readJson("data/validation/validator_registry.json");
const matrix = readJson("_repo_validation_matrix.json");
const pkg = readJson("package.json");

if (registry.schemaVersion !== "2.0.0") fail("[validation-registry] stale registry schema");
if (JSON.stringify(registry.validators) !== JSON.stringify(dataRegistry.validators)) fail("[validation-registry] root/data registries diverge");

const ids = new Set(registry.validators.map((item) => item.id));
for (const validator of registry.validators) {
  if (!validator.id || !validator.npmScript || !validator.entrypoint || !validator.severity || !validator.blockReason) fail("[validation-registry] incomplete validator " + validator.id);
  if (!pkg.scripts[validator.npmScript]) fail("[validation-registry] npm script missing for " + validator.id);
  if (validator.severity === "HARD_FAIL" && validator.blocksRelease !== true) fail("[validation-registry] hard fail must block release " + validator.id);
}

for (const [profile, validators] of Object.entries(matrix.profiles)) {
  if (profile === "live_provider_smoke") continue;
  for (const id of validators) {
    if (id === "build") continue;
    if (!ids.has(id)) fail(`[validation-registry] matrix references unknown validator ${id}`);
  }
}

for (const required of ["public-page-depth", "atlas-query-fanout", "seo-aeo-geo-surfaces", "admin-dashboard", "e2e-user-journey", "workflow-data-trace", "automation-safety"]) {
  if (!ids.has(required)) fail("[validation-registry] required validator missing " + required);
}

console.log(`[validation-registry] OK validators=${registry.validators.length}`);
