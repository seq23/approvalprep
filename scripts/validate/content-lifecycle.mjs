#!/usr/bin/env node
import fs from "node:fs";
const required = [
  "data/intelligence/content_decay_report.json",
  "data/content/consolidation_plan.json",
  "data/content/retired_pages.json",
  "data/routes/redirects.json"
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`${file} missing`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data.schemaVersion) throw new Error(`${file} missing schemaVersion`);
}
const decay = JSON.parse(fs.readFileSync("data/intelligence/content_decay_report.json", "utf8"));
if (!Array.isArray(decay.items)) throw new Error("content_decay_report missing items array");
for (const item of decay.items) {
  if (!item.route || !item.recommendedAction) throw new Error("decay item missing route or recommendedAction");
  if (item.claimType !== "structural_not_live_performance") throw new Error(`${item.route} lifecycle item must label structural claimType`);
}
const plan = JSON.parse(fs.readFileSync("data/content/consolidation_plan.json", "utf8"));
if (!Array.isArray(plan.candidates)) throw new Error("consolidation_plan missing candidates array");
for (const candidate of plan.candidates) {
  if (candidate.sourceRoute === candidate.targetRoute) throw new Error(`redirect loop candidate ${candidate.sourceRoute}`);
  if (candidate.safeToApplyAutomatically !== false) throw new Error(`${candidate.sourceRoute} consolidation must be approval-gated`);
}
const redirects = JSON.parse(fs.readFileSync("data/routes/redirects.json", "utf8"));
if (!Array.isArray(redirects.redirects)) throw new Error("redirects missing redirects array");
for (const redirect of redirects.redirects) {
  if (!redirect.from || !redirect.to || ![301,302,307,308].includes(redirect.status)) throw new Error("invalid redirect record");
  if (redirect.from === redirect.to) throw new Error(`redirect loop ${redirect.from}`);
}
console.log("[validate:content-lifecycle] OK");
