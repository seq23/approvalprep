#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
const tools = JSON.parse(fs.readFileSync("data/tools/tool_registry.json", "utf8"));
const checklists = JSON.parse(fs.readFileSync("data/tools/checklist_registry.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const paths = new Set(manifest.routes.map((route) => route.path));
if (!Array.isArray(tools.tools) || tools.tools.length < 5) fail("[authority-assets] too few tools");
for (const tool of tools.tools) {
  if (!tool.path.startsWith("/tools/") || !paths.has(tool.path)) fail("[authority-assets] tool missing route " + tool.path);
  if (tool.status !== "published_by_contract") fail("[authority-assets] unexpected unpublished tool " + tool.path);
  if (!Array.isArray(tool.checklist) || tool.checklist.length < 5) fail("[authority-assets] thin checklist " + tool.path);
}
if (!Array.isArray(checklists.checklists) || checklists.checklists.length !== tools.tools.length) fail("[authority-assets] checklist registry mismatch");
console.log(`[authority-assets] OK tools=${tools.tools.length}`);
