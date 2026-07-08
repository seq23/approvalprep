#!/usr/bin/env node
import fs from "node:fs";
import { exists, fail } from "./_common.mjs";
if (!exists("_artifact_validation_manifest.json")) fail("[artifact] missing _artifact_validation_manifest.json");
const manifest = JSON.parse(fs.readFileSync("_artifact_validation_manifest.json", "utf8"));
if (!manifest.artifactName?.startsWith("approvalprep_BASELINE_07-07-26_")) fail("[artifact] bad artifact name");
if (manifest.zipRoot !== "approvalprep/") fail("[artifact] bad zip root");
console.log("[artifact] OK");
