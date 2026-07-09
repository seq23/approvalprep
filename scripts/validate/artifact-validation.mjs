#!/usr/bin/env node
import fs from "node:fs";
import { exists, fail } from "./_common.mjs";

if (!exists("_artifact_validation_manifest.json")) fail("[artifact] missing _artifact_validation_manifest.json");
const manifest = JSON.parse(fs.readFileSync("_artifact_validation_manifest.json", "utf8"));
if (!manifest.artifactName?.startsWith("approvalprep-")) fail("[artifact] artifact name must start with approvalprep-");
if (!manifest.artifactName?.endsWith(".zip")) fail("[artifact] artifact must be a zip");
if (manifest.zipRoot !== "approvalprep-main/") fail("[artifact] expected zip root approvalprep-main/");
if (!manifest.status?.includes("STRUCTURALLY_CHECKED")) fail("[artifact] status must describe structural validation state");
for (const key of ["implemented", "notImplemented"]) {
  if (!Array.isArray(manifest[key]) || manifest[key].length < 5) fail(`[artifact] ${key} checklist is incomplete`);
}
for (const key of ["cloudflareDeploy", "stripeWebhookDelivery", "r2PaidDownloadStreaming", "realCitationWins"]) {
  if (!manifest.providerValidation?.[key]) fail(`[artifact] provider validation missing ${key}`);
}
console.log(`[artifact] OK ${manifest.artifactName}`);
