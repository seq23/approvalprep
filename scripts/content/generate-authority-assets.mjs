#!/usr/bin/env node
import fs from "node:fs";
const tools = JSON.parse(fs.readFileSync("data/tools/tool_registry.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const paths = new Set(manifest.routes.map((route) => route.path));
const missing = tools.tools.filter((tool) => tool.status === "published_by_contract" && !paths.has(tool.path));
if (missing.length) throw new Error(`[authority-assets] missing manifest route(s): ${missing.map((tool) => tool.path).join(", ")}`);
fs.writeFileSync("data/workflow_traces/authority-assets.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), tools: tools.tools.length, missingRoutes: [] }, null, 2) + "\n");
console.log(`[authority-assets] OK tools=${tools.tools.length}`);
