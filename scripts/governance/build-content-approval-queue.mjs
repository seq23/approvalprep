#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

function readJson(path, fallback = null) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}
function writeJson(path, data) {
  fs.mkdirSync(path.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
function checksum(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}
function riskNeedsApproval(risk, status, text, policy) {
  const normalized = `${risk || ""} ${status || ""} ${text || ""}`.toLowerCase();
  if (["regulated", "high"].includes(String(risk || "").toLowerCase())) return true;
  if (String(status || "").includes("approval_required")) return true;
  if (normalized.includes("credit dispute") || normalized.includes("credit repair")) return true;
  return (policy.prohibitedClaims || []).some((claim) => normalized.includes(claim));
}

const policy = readJson("data/governance/publication_policy.json");
const answers = readJson("data/content/generated_answers.json", { answers: [] });
const pageRegistry = readJson("data/content/page_registry.json", { pages: [] });
const templateRegistry = readJson("data/templates/template_registry.json", { templates: [] });
const history = readJson("data/governance/content_approval_history.json", { approvals: [] });
const approvedIds = new Set((history.approvals || []).filter((item) => item.status === "approved").map((item) => item.contentId));

const items = [];
for (const answer of answers.answers || []) {
  const contentId = `answer:${answer.id}`;
  const text = `${answer.title || ""} ${answer.answer || ""}`;
  if (!approvedIds.has(contentId) && riskNeedsApproval(answer.riskLevel, answer.status, text, policy)) {
    items.push({
      contentId,
      type: "generated_answer",
      title: answer.title,
      path: answer.route,
      risk: answer.riskLevel,
      currentStatus: answer.status,
      reason: "generated answer requires policy approval before public promotion",
      requiredAction: "approve_or_rewrite_or_block",
      sourceFile: "data/content/generated_answers.json",
      sourceChecksum: checksum(answer),
      ownerApprovalRequired: true
    });
  }
}
for (const page of pageRegistry.pages || []) {
  const contentId = `page:${page.id || page.path}`;
  const text = `${page.title || ""} ${page.path || ""}`;
  if (!approvedIds.has(contentId) && riskNeedsApproval(page.risk, page.status, text, policy)) {
    items.push({
      contentId,
      type: "page_registry_entry",
      title: page.title,
      path: page.path,
      risk: page.risk,
      currentStatus: page.status,
      reason: "page registry entry requires publication governance approval",
      requiredAction: "approve_or_rewrite_or_block",
      sourceFile: "data/content/page_registry.json",
      sourceChecksum: checksum(page),
      ownerApprovalRequired: true
    });
  }
}
for (const template of templateRegistry.templates || []) {
  const contentId = `template:${template.id || template.path}`;
  const text = `${template.title || ""} ${template.path || ""}`;
  if (!approvedIds.has(contentId) && riskNeedsApproval(template.risk, template.status, text, policy)) {
    items.push({
      contentId,
      type: "template_preview",
      title: template.title,
      path: template.path,
      risk: template.risk,
      currentStatus: template.status,
      reason: "template preview requires approval before publication",
      requiredAction: "approve_or_rewrite_or_block",
      sourceFile: "data/templates/template_registry.json",
      sourceChecksum: checksum(template),
      ownerApprovalRequired: true
    });
  }
}
items.sort((a, b) => String(a.path).localeCompare(String(b.path)) || String(a.contentId).localeCompare(String(b.contentId)));
writeJson("data/governance/content_approval_queue.json", {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  policy: "data/governance/publication_policy.json",
  items
});
console.log(`[governance:content-approval-queue] queued ${items.length} items`);
