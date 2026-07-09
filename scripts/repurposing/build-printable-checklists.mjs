#!/usr/bin/env node
import fs from "node:fs";
const registry = JSON.parse(fs.readFileSync("data/repurposing/repurpose_registry.json", "utf8"));
for (const output of registry.outputs) {
  const local = `public${output.outputPath}`;
  if (!fs.existsSync(local)) throw new Error(`missing repurposed output: ${output.outputPath}`);
}
fs.writeFileSync("data/workflow_traces/repurposing-checklists.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), outputs: registry.outputs.length }, null, 2) + "\n");
console.log(`[repurpose:checklists] OK outputs=${registry.outputs.length}`);
