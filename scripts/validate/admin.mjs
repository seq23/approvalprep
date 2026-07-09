#!/usr/bin/env node
import { readJson, exists, fail } from "./_common.mjs";
if (!exists("src/pages/admin.astro")) fail("[admin] missing admin page");
const growth = readJson("data/admin/growth_health.json").panels.map((p) => p.name);
for (const panel of ["SEO Health", "AEO Health", "GEO Health", "Query Universe", "Citation Targets", "Citation Wins", "Citation Gaps", "Indexing", "Self-Healing Log", "Blockers"]) {
  if (!growth.includes(panel)) fail("[admin] missing growth panel " + panel);
}
const adminPage = await import("node:fs").then((fs) => fs.readFileSync("src/pages/admin.astro", "utf8"));
for (const token of ["Growth cockpit", "SEO / AEO / GEO operating dashboard", "Indexed query universe", "Workflow traces", "Final blocks", "Fixture traces prove workflow shape"]) {
  if (!adminPage.includes(token)) fail("[admin] admin dashboard missing visible cockpit token " + token);
}
const queries = readJson("data/atlas/query_universe.json").queries;
const atoms = readJson("data/atoms/answer_atoms.json").atoms;
const answers = readJson("data/content/generated_answers.json").answers;
if (queries.length < 200 || atoms.length < 150 || answers.length < 30) fail("[admin] dashboard source data is too thin");
console.log(`[admin] OK panels=${growth.length} queries=${queries.length} atoms=${atoms.length} answers=${answers.length}`);
