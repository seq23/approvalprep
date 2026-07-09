#!/usr/bin/env node
import fs from "node:fs";
const required = [
  "data/governance/publication_policy.json",
  "data/governance/content_approval_queue.json",
  "data/governance/content_approval_history.json",
  "scripts/governance/build-content-approval-queue.mjs",
  "scripts/governance/promote-approved-content.mjs"
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`${file} missing`);
}
const policy = JSON.parse(fs.readFileSync("data/governance/publication_policy.json", "utf8"));
if (policy.schemaVersion !== "1.0.0") throw new Error("publication_policy schema mismatch");
if (!Array.isArray(policy.prohibitedClaims) || policy.prohibitedClaims.length < 5) throw new Error("publication_policy prohibited claims incomplete");
if (!Array.isArray(policy.approvalRequiredWhen) || policy.approvalRequiredWhen.length < 4) throw new Error("publication_policy approval triggers incomplete");
const queue = JSON.parse(fs.readFileSync("data/governance/content_approval_queue.json", "utf8"));
if (queue.schemaVersion !== "1.0.0" || !Array.isArray(queue.items)) throw new Error("approval queue schema invalid");
const ids = new Set();
for (const item of queue.items) {
  for (const key of ["contentId", "type", "title", "path", "risk", "currentStatus", "reason", "requiredAction", "sourceFile", "sourceChecksum"]) {
    if (!item[key]) throw new Error(`approval queue item missing ${key}`);
  }
  if (ids.has(item.contentId)) throw new Error(`duplicate approval queue contentId ${item.contentId}`);
  ids.add(item.contentId);
  if (item.ownerApprovalRequired !== true) throw new Error(`${item.contentId} must require owner approval`);
}
const history = JSON.parse(fs.readFileSync("data/governance/content_approval_history.json", "utf8"));
if (history.schemaVersion !== "1.0.0" || !Array.isArray(history.approvals) || !Array.isArray(history.promotions)) throw new Error("approval history schema invalid");
for (const approval of history.approvals) {
  if (!approval.contentId || !["approved", "rejected", "rewrite_required", "blocked"].includes(approval.status)) throw new Error("invalid approval history record");
  if (approval.status === "approved") {
    for (const key of ["approvedBy", "approvedAt", "sourceChecksum"]) if (!approval[key]) throw new Error(`approved record missing ${key}`);
  }
}
console.log(`[validate:content-approval-governance] OK queued=${queue.items.length} approvals=${history.approvals.length}`);
