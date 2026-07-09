#!/usr/bin/env node
import fs from "node:fs";
const templates = JSON.parse(fs.readFileSync("data/templates/template_registry.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const paths = new Set(manifest.routes.map((route) => route.path));
const missing = templates.templates.filter((template) => template.status === "published_by_contract" && !paths.has(template.path));
if (missing.length) throw new Error(`[templates] missing manifest route(s): ${missing.map((template) => template.path).join(", ")}`);
fs.writeFileSync("data/workflow_traces/template-pages.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), templates: templates.templates.length, missingRoutes: [] }, null, 2) + "\n");
console.log(`[templates] OK templates=${templates.templates.length}`);
