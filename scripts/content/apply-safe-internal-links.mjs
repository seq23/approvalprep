#!/usr/bin/env node
import fs from "node:fs";
const graph = JSON.parse(fs.readFileSync("data/atlas/internal_link_graph.json", "utf8"));
const trace = { schemaVersion: "1.0.0", mode: "static_component", generatedAt: new Date().toISOString(), recordsAvailable: graph.records.length, appliedBy: "RelatedContent.astro" };
fs.writeFileSync("data/workflow_traces/internal-link-application.json", JSON.stringify(trace, null, 2) + "\n");
console.log(`[internal-links:apply] OK recordsAvailable=${graph.records.length}`);
