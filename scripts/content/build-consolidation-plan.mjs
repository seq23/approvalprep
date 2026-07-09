#!/usr/bin/env node
import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const routes = (manifest.routes || []).filter((route) => route.type === "public" && route.index);
const seen = new Map();
const candidates = [];
for (const route of routes) {
  const key = [route.family || "", route.page_intent || "", String(route.title || "").toLowerCase().replace("approvalprep", "").trim()].join("|");
  if (seen.has(key) && seen.get(key) !== route.path) {
    candidates.push({ sourceRoute: route.path, targetRoute: seen.get(key), status: "needs_review", reason: "possible_duplicate_intent", safeToApplyAutomatically: false });
  } else {
    seen.set(key, route.path);
  }
}
fs.mkdirSync("data/content", { recursive: true });
fs.writeFileSync("data/content/consolidation_plan.json", JSON.stringify({
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  policy: "No public URL is retired or redirected without an approved consolidation record. This plan is advisory until approved.",
  candidates
}, null, 2) + "\n");
console.log(`[content:consolidation-plan] candidates=${candidates.length}`);
