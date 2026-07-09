#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
const graph = JSON.parse(fs.readFileSync("data/atlas/internal_link_graph.json", "utf8"));
const anchors = JSON.parse(fs.readFileSync("data/atlas/anchor_text_registry.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const publicPaths = new Set(manifest.routes.filter((route) => route.index && route.type === "public").map((route) => route.path));
if (!Array.isArray(graph.records) || graph.records.length < 20) fail("[internal-link-graph] too few records");
if (!Array.isArray(anchors.anchors) || anchors.anchors.length < graph.records.length) fail("[internal-link-graph] too few anchors");
const byPath = new Set();
for (const record of graph.records) {
  if (!record.path || byPath.has(record.path)) fail("[internal-link-graph] duplicate or missing record path " + record.path);
  byPath.add(record.path);
  if (!Array.isArray(record.links) || record.links.length < 2) fail("[internal-link-graph] public page has fewer than two links " + record.path);
  for (const link of record.links) {
    if (link.href === record.path) fail("[internal-link-graph] self link " + record.path);
    if (!publicPaths.has(link.href) && !["/letter-writing-studio", "/pricing", "/resources"].includes(link.href)) fail("[internal-link-graph] link target is not a public route " + link.href);
    if (!link.anchorText || link.anchorText.length < 4) fail("[internal-link-graph] weak anchor text " + record.path);
  }
}
console.log(`[internal-link-graph] OK records=${graph.records.length} anchors=${anchors.anchors.length}`);
