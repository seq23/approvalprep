#!/usr/bin/env node
// Inspect the frozen release corpus for duplicate keys, invalid published rows
// and broken canonical redirects, and block the release when it finds any.
//
// Rule 0 / zero-item rule: an empty answer corpus is not a clean bill of
// health. This stage used to print `[content:self-heal] OK answers=0` and exit
// 0 when data/content/generated_answers.json carried no answers at all, which
// is the same green a fully validated corpus gets - a wiped or half-written
// corpus certified the release. Zero inspected answers is now a named hard stop
// (BLOCKED_EMPTY_ANSWER_CORPUS), and every report records which guard ran.
import fs from "node:fs";

const file = "data/content/generated_answers.json";
const document = JSON.parse(fs.readFileSync(file, "utf8"));
const answers = Array.isArray(document.answers) ? document.answers : [];
const redirects = JSON.parse(fs.readFileSync("data/routes/redirects.json", "utf8")).redirects || [];
const redirectBySource = new Map(redirects.map((item) => [item.source, item.destination]));
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
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
const invalidReleaseAnswers = answers.filter((answer) => {
  if (!String(answer.releaseId || "").startsWith("content-release-")) return false;
  if (answer.status === "published_by_contract") return answer.riskLevel !== "low" || !answer.slug || !answer.contentHash;
  if (answer.status === "redirected_to_canonical") {
    const source = `/blog/${answer.slug || slugify(answer.title || "")}`;
    return !answer.redirectTarget || redirectBySource.get(source) !== answer.redirectTarget;
  }
  return true;
});
const redirected = answers.filter((answer) => answer.status === "redirected_to_canonical");
const invalidRedirects = redirected.filter((answer) => {
  const source = `/blog/${answer.slug || slugify(answer.title || "")}`;
  return !answer.redirectTarget || redirectBySource.get(source) !== answer.redirectTarget;
});
fs.mkdirSync("reports", { recursive: true });
const report = {
  schemaVersion: "2.2.0",
  zeroItemGuard: "HARD_FAIL_ON_ZERO_INSPECTED",
  generatedAt: new Date().toISOString(),
  status: answers.length === 0
    ? "BLOCKED_EMPTY_ANSWER_CORPUS"
    : duplicates.length || invalidReleaseAnswers.length || invalidRedirects.length ? "BLOCKED_INVALID_RELEASE_DATA" : "NO_SAFE_REPAIRS_NEEDED",
  inspectedAnswers: answers.length,
  publishedAnswerCount: answers.filter((answer) => answer.status === "published_by_contract").length,
  redirectedAnswerCount: redirected.length,
  duplicateCount: duplicates.length,
  invalidReleaseAnswerCount: invalidReleaseAnswers.length,
  invalidRedirectCount: invalidRedirects.length,
  duplicates: duplicates.slice(0, 20),
  invalidReleaseIds: invalidReleaseAnswers.map((item) => item.id).slice(0, 20),
  invalidRedirectIds: invalidRedirects.map((item) => item.id).slice(0, 20)
};
fs.writeFileSync("reports/self-healing-log.json", JSON.stringify(report, null, 2) + "\n");
if (answers.length === 0) {
  console.error(JSON.stringify(report, null, 2));
  console.error(`[content:self-heal] STOP: BLOCKED_EMPTY_ANSWER_CORPUS - ${file} carries no answers, so there is nothing to certify. Refusing to pass a release on an empty corpus.`);
  process.exit(1);
}
if (duplicates.length || invalidReleaseAnswers.length || invalidRedirects.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(`[content:self-heal] OK answers=${answers.length} published=${report.publishedAnswerCount} redirected=${redirected.length}`);
