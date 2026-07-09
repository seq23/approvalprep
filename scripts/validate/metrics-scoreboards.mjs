#!/usr/bin/env node
import fs from "node:fs";
const required = [
  "data/metrics/content_velocity.json",
  "data/metrics/citation_scoreboard.json",
  "data/metrics/indexing_scoreboard.json",
  "data/metrics/crawler_scoreboard.json",
  "data/metrics/conversion_scoreboard.json"
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`${file} missing`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data.schemaVersion) throw new Error(`${file} missing schemaVersion`);
  if (!data.generatedAt) throw new Error(`${file} missing generatedAt`);
  if (!Array.isArray(data.metrics)) throw new Error(`${file} missing metrics array`);
  for (const metric of data.metrics) {
    if (!metric.label) throw new Error(`${file} has metric missing label`);
    if (typeof metric.value !== "number") throw new Error(`${file} metric ${metric.label} value must be number`);
    if (!metric.source) throw new Error(`${file} metric ${metric.label} missing source`);
    if (!metric.claimType) throw new Error(`${file} metric ${metric.label} missing claimType`);
  }
  const text = fs.readFileSync(file, "utf8");
  if (/confirmed citations[^\n]*(?:[1-9]\d*)/i.test(text)) throw new Error(`${file} appears to claim confirmed citations without ledger validation`);
}
console.log("[validate:metrics-scoreboards] OK");
