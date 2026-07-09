#!/usr/bin/env node
import fs from "node:fs";
const fail = (message) => { console.error(message); process.exit(1); };
const queue = JSON.parse(fs.readFileSync("data/repurposing/repurpose_queue.json", "utf8"));
const registry = JSON.parse(fs.readFileSync("data/repurposing/repurpose_registry.json", "utf8"));
if (!Array.isArray(queue.items) || queue.items.length < 2) fail("[repurposing] missing queue outputs");
if (!Array.isArray(registry.outputs) || registry.outputs.length !== queue.items.length) fail("[repurposing] registry mismatch");
for (const output of registry.outputs) {
  if (!output.outputPath.startsWith("/downloads/free-checklists/")) fail(`[repurposing] unsafe output path ${output.outputPath}`);
  if (!fs.existsSync(`public${output.outputPath}`)) fail(`[repurposing] missing file ${output.outputPath}`);
  const text = fs.readFileSync(`public${output.outputPath}`, "utf8").toLowerCase();
  if (!text.includes("does not") || text.includes("guaranteed approval")) fail(`[repurposing] missing boundary or unsafe claim ${output.outputPath}`);
}
console.log(`[repurposing] OK outputs=${registry.outputs.length}`);
