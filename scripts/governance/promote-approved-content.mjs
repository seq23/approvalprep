#!/usr/bin/env node
import fs from "node:fs";

function readJson(path, fallback = null) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}
function writeJson(path, data) {
  fs.mkdirSync(path.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
function assertApproval(record) {
  if (record.status !== "approved") return false;
  for (const key of ["contentId", "approvedBy", "approvedAt", "sourceChecksum"]) {
    if (!record[key]) throw new Error(`approval record missing ${key}`);
  }
  return true;
}

const historyPath = "data/governance/content_approval_history.json";
const history = readJson(historyPath, { schemaVersion: "1.0.0", approvals: [], promotions: [] });
const promoted = new Set((history.promotions || []).map((item) => item.contentId));
const approvals = (history.approvals || []).filter(assertApproval).filter((item) => !promoted.has(item.contentId));
let changed = false;
let answers = readJson("data/content/generated_answers.json", { answers: [] });
let pageRegistry = readJson("data/content/page_registry.json", { pages: [] });
let templateRegistry = readJson("data/templates/template_registry.json", { templates: [] });
const promotions = [...(history.promotions || [])];

for (const approval of approvals) {
  let applied = false;
  if (approval.contentId.startsWith("answer:")) {
    const id = approval.contentId.slice("answer:".length);
    for (const answer of answers.answers || []) {
      if (answer.id === id) {
        answer.status = "published_by_approval";
        answer.approvedBy = approval.approvedBy;
        answer.approvedAt = approval.approvedAt;
        applied = true;
      }
    }
    if (applied) writeJson("data/content/generated_answers.json", answers);
  }
  if (approval.contentId.startsWith("page:")) {
    const id = approval.contentId.slice("page:".length);
    for (const page of pageRegistry.pages || []) {
      if (page.id === id || page.path === id) {
        page.status = "published_by_approval";
        page.approvedBy = approval.approvedBy;
        page.approvedAt = approval.approvedAt;
        applied = true;
      }
    }
    if (applied) writeJson("data/content/page_registry.json", pageRegistry);
  }
  if (approval.contentId.startsWith("template:")) {
    const id = approval.contentId.slice("template:".length);
    for (const template of templateRegistry.templates || []) {
      if (template.id === id || template.path === id) {
        template.status = "published_by_approval";
        template.approvedBy = approval.approvedBy;
        template.approvedAt = approval.approvedAt;
        applied = true;
      }
    }
    if (applied) writeJson("data/templates/template_registry.json", templateRegistry);
  }
  promotions.push({
    contentId: approval.contentId,
    promotedAt: new Date().toISOString(),
    approvedBy: approval.approvedBy,
    sourceChecksum: approval.sourceChecksum,
    applied
  });
  changed = true;
}
if (changed) writeJson(historyPath, { ...history, schemaVersion: "1.0.0", promotions });
console.log(`[governance:promote-approved-content] processed ${approvals.length} approvals`);
