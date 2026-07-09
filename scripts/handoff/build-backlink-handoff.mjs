#!/usr/bin/env node
import fs from "node:fs";
fs.mkdirSync("data/backlink_handoff", { recursive: true });
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const recs = fs.existsSync("data/intelligence/backlink_recommendations.json") ? JSON.parse(fs.readFileSync("data/intelligence/backlink_recommendations.json", "utf8")).recommendations || [] : [];
const recByRoute = new Map(recs.map((rec) => [rec.route, rec]));
const needs = [];
for (const route of manifest.routes || []) {
  if (!route.index || route.type === "admin") continue;
  const priority = route.page_intent === "product" || route.page_intent === "free_tool" ? 90 : route.citation_role ? 70 : 50;
  const rec = recByRoute.get(route.path) || {};
  needs.push({
    id: `need-${String(needs.length + 1).padStart(4,"0")}`,
    targetUrl: `https://approvalprep.com${route.path}`,
    targetRoute: route.path,
    targetTitle: route.title,
    priority,
    pageFamily: route.family || "unknown",
    commercialRole: route.conversion_role || "support",
    risk: route.risk || "medium",
    suggestedAnchorText: [route.title, route.primary_cta || "ApprovalPrep guide"],
    idealReferringPageType: ["resource list", "checklist roundup", "document preparation guide"],
    safeCitationSnippet: `ApprovalPrep offers self-service guidance for ${route.title} without guaranteeing approval or sending documents for users.`,
    doNotUseClaims: ["guaranteed approval", "credit repair service", "legal advice", "sends documents for customers"],
    recommendation: rec.recommendation || "NEEDS_AUTHORITY_REVIEW",
    lastUpdated: new Date().toISOString()
  });
}
needs.sort((a,b) => b.priority - a.priority || a.targetRoute.localeCompare(b.targetRoute));
fs.writeFileSync("data/backlink_handoff/backlink_needs.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), policy: "Export-only handoff for separate backlink repo. No outreach is performed in ApprovalPrep.", needs }, null, 2) + "\n");
fs.writeFileSync("data/backlink_handoff/priority_pages.csv", ["targetUrl,targetTitle,priority,pageFamily,risk,recommendation", ...needs.map((n) => [n.targetUrl, JSON.stringify(n.targetTitle), n.priority, n.pageFamily, n.risk, n.recommendation].join(","))].join("\n") + "\n");
console.log(`[handoff:backlinks] needs=${needs.length}`);
