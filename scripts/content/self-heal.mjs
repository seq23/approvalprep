#!/usr/bin/env node
import fs from "node:fs";

const file = "data/content/generated_answers.json";
const document = JSON.parse(fs.readFileSync(file, "utf8"));
const answers = Array.isArray(document.answers) ? document.answers : [];
const duplicates = [];
for (const field of ["id", "title", "slug", "contentKey", "contentHash"]) {
  const seen = new Set();
  for (const answer of answers) {
    const value = answer[field];
    if (!value) continue;
    if (seen.has(value)) duplicates.push({ field, value });
    seen.add(value);
  }
}
const invalidReleaseAnswers = answers.filter((answer) =>
  String(answer.releaseId || "").startsWith("content-release-") &&
  (answer.status !== "published_by_contract" || answer.riskLevel !== "low" || !answer.slug || !answer.contentHash)
);
fs.mkdirSync("reports", { recursive: true });
const report = {
  schemaVersion: "2.0.0",
  generatedAt: new Date().toISOString(),
  status: duplicates.length || invalidReleaseAnswers.length ? "BLOCKED_INVALID_RELEASE_DATA" : "NO_SAFE_REPAIRS_NEEDED",
  inspectedAnswers: answers.length,
  duplicateCount: duplicates.length,
  invalidReleaseAnswerCount: invalidReleaseAnswers.length,
  duplicates: duplicates.slice(0, 20),
  invalidReleaseIds: invalidReleaseAnswers.map((item) => item.id).slice(0, 20)
};
fs.writeFileSync("reports/self-healing-log.json", JSON.stringify(report, null, 2) + "\n");
if (duplicates.length || invalidReleaseAnswers.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(`[content:self-heal] OK answers=${answers.length}`);
