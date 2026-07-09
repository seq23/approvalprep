#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
const templates = JSON.parse(fs.readFileSync("data/templates/template_registry.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const paths = new Set(manifest.routes.map((route) => route.path));
if (!Array.isArray(templates.templates) || templates.templates.length < 5) fail("[template-library] too few templates");
for (const template of templates.templates) {
  if (!template.path.startsWith("/templates/") || !paths.has(template.path)) fail("[template-library] template missing route " + template.path);
  if (template.status === "published_by_contract" && (!Array.isArray(template.safePreview) || template.safePreview.length < 4)) fail("[template-library] thin public preview " + template.path);
  if (/guarantees approval|guaranteed approval|approval guarantee/i.test(JSON.stringify(template))) fail("[template-library] prohibited claim " + template.path);
}
console.log(`[template-library] OK templates=${templates.templates.length}`);
