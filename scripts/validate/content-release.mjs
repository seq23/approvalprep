#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fail } from "./_common.mjs";

const generatedPath = "data/content/generated_answers.json";
const ledgerPath = "data/release/release_ledger.json";
const generatedBefore = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, "utf8") : null;
const ledgerBefore = fs.readFileSync(ledgerPath, "utf8");

function restore() {
  if (generatedBefore === null) {
    if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
  } else {
    fs.writeFileSync(generatedPath, generatedBefore);
  }
  fs.writeFileSync(ledgerPath, ledgerBefore);
}

try {
  for (const [label, args] of [
    ["content:generate", ["scripts/content/generate-candidate.mjs"]],
    ["content:self-heal", ["scripts/content/self-heal.mjs"]]
  ]) {
    const result = spawnSync(process.execPath, args, { stdio: "pipe", encoding: "utf8" });
    if (result.status !== 0) fail(`[content-release] ${label} failed ${result.stderr || result.stdout}`);
  }

  const generated = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  if (generated.schemaVersion !== "2.0.0") fail("[content-release] generated answers schema mismatch");
  if (!Array.isArray(generated.answers) || generated.answers.length < 30) fail("[content-release] expected at least 30 generated route answer assets");
  if (!generated.answers.every((answer) => answer.id && answer.title && answer.route && answer.status && answer.answer)) fail("[content-release] generated answer missing required fields");
  if (!ledger.releases?.some((release) => release.status === "generated_route_answer_assets" && release.routesCovered >= 30)) fail("[content-release] release ledger missing generated route answer asset entry");
  console.log(`[content-release] OK generated=${generated.answers.length}`);
} finally {
  restore();
}
