#!/usr/bin/env node
import fs from "node:fs";
const now = new Date().toISOString();
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const routes = (manifest.routes || []).filter((route) => route.type === "public" && route.index);
const coreRoutes = new Set(["/", "/pricing", "/letter-writing-studio"]);
const items = routes.map((route) => {
  const reasonCodes = [];
  let recommendedAction = "refresh";
  if (route.risk === "regulated" || route.path.includes("credit")) {
    recommendedAction = "approval_required_refresh";
    reasonCodes.push("regulated_or_credit_sensitive");
  }
  if (coreRoutes.has(route.path)) {
    recommendedAction = "protect_and_refresh";
    reasonCodes.push("core_conversion_route");
  }
  if (!reasonCodes.length) reasonCodes.push("no_live_performance_data_yet");
  return {
    route: route.path,
    title: route.title,
    risk: route.risk || "low",
    pageFamily: route.family || "unknown",
    recommendedAction,
    reasonCodes,
    priorityScore: recommendedAction === "approval_required_refresh" ? 90 : recommendedAction === "protect_and_refresh" ? 70 : 55,
    source: "route_manifest_and_existing_intelligence",
    claimType: "structural_not_live_performance",
    ownerReviewRequired: recommendedAction === "approval_required_refresh"
  };
});
fs.mkdirSync("data/intelligence", { recursive: true });
fs.writeFileSync("data/intelligence/content_decay_report.json", JSON.stringify({
  schemaVersion: "1.0.0",
  generatedAt: now,
  mode: "structural",
  policy: "Lifecycle recommendations do not claim traffic, ranking, indexing, or conversion decay without live telemetry.",
  items
}, null, 2) + "\n");
console.log(`[content:decay-report] wrote ${items.length} lifecycle recommendations`);
