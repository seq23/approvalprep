#!/usr/bin/env node
import { readJson, writeJson, arr, countPublicRoutes, metricItem } from "./lib.mjs";

const manifest = readJson("data/routes/route_manifest.json", { routes: [] });
const answers = readJson("data/content/generated_answers.json", { answers: [] });
const atoms = readJson("data/atoms/answer_atoms.json", { atoms: [] });
const targets = readJson("data/atoms/citation_targets.json", { targets: [] });
const pageRegistry = readJson("data/content/page_registry.json", { pages: [] });
const tools = readJson("data/tools/tool_registry.json", { tools: [] });
const templates = readJson("data/templates/template_registry.json", { templates: [] });
const links = readJson("data/atlas/internal_link_graph.json", { links: [] });

const publicRoutes = countPublicRoutes(manifest);
const publishedAnswers = arr(answers, "answers").filter((a) => a.status === "published_by_contract");
const generatedPages = arr(pageRegistry, "pages").filter((p) => p.status === "published_by_contract");
const publicTools = arr(tools, "tools").filter((t) => t.status !== "blocked");
const publicTemplates = arr(templates, "templates").filter((t) => t.status !== "blocked");

const metrics = [
  metricItem("Public indexed routes", publicRoutes),
  metricItem("Generated standalone pages", generatedPages.length),
  metricItem("Published answer assets", publishedAnswers.length),
  metricItem("Answer atoms", arr(atoms, "atoms").length),
  metricItem("Citation targets", arr(targets, "targets").length),
  metricItem("Authority tools", publicTools.length),
  metricItem("Template preview pages", publicTemplates.length),
  metricItem("Internal link edges", arr(links, "links").length)
];

writeJson("data/metrics/content_velocity.json", {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  mode: "structural_repo_counts",
  warning: "Counts show publication machinery and repo surfaces. They do not prove indexing, rankings, traffic, backlinks, or LLM citations.",
  metrics
});
console.log(`[metrics:content-velocity] wrote ${metrics.length} metrics`);
