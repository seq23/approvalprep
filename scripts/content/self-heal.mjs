#!/usr/bin/env node
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
  schemaVersion: "2.1.0",
  generatedAt: new Date().toISOString(),
  status: duplicates.length || invalidReleaseAnswers.length || invalidRedirects.length ? "BLOCKED_INVALID_RELEASE_DATA" : "NO_SAFE_REPAIRS_NEEDED",
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
if (duplicates.length || invalidReleaseAnswers.length || invalidRedirects.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(`[content:self-heal] OK answers=${answers.length} published=${report.publishedAnswerCount} redirected=${redirected.length}`);
