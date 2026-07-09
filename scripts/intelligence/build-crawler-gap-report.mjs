#!/usr/bin/env node
import { readJson, writeJson } from "./_lib.mjs";
const manifest = readJson("data/routes/route_manifest.json", { routes: [] });
const logs = readJson("data/intelligence/cloudflare_crawler_logs.json", { mode: "unavailable", visits: [] });
const crawledPaths = new Set((logs.visits || []).map((visit) => visit.path || (visit.url ? new URL(visit.url, "https://approvalprep.com").pathname : "")).filter(Boolean));
const publicRoutes = manifest.routes.filter((route) => route.index !== false && route.type !== "admin");
const uncrawled = publicRoutes.filter((route) => !crawledPaths.has(route.path)).map((route) => ({ path: route.path, title: route.title, family: route.family, risk: route.risk, priority: route.cta_policy === "purchase" ? "high" : "normal" }));
const byBot = {};
for (const visit of logs.visits || []) byBot[visit.bot || "Other"] = (byBot[visit.bot || "Other"] || 0) + Number(visit.requests || 1);
writeJson("data/intelligence/crawler_gap_report.json", { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), sourceMode: logs.mode || "unavailable", publicRouteCount: publicRoutes.length, crawledRouteCount: publicRoutes.length - uncrawled.length, uncrawledRoutes: uncrawled.slice(0, 250), byBot, warning: logs.mode === "live" || logs.mode === "manual_import" ? null : "Crawler gap report is readiness-only until Cloudflare crawler data is live or imported." });
console.log(`[crawler-gap] uncrawled=${uncrawled.length} sourceMode=${logs.mode || "unavailable"}`);
