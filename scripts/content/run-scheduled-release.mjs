#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const sequence = [
  "authority:yield:build",
  "authority:scale:fanout",
  "authority:scale:restore",
  "content:generate",
  "content:self-heal",
  "seo:sitemap",
  "authority:scale:freeze",
  "authority:scale:clear-scope",
  "authority:scale:validate",
  "validate:kpi-truth"
];

for (const script of sequence) {
  const command = pkg.scripts?.[script];
  if (!command) {
    console.error(`[content:release] missing package script ${script}`);
    process.exit(1);
  }
  const result = spawnSync("npm", ["run", script], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("[content:release] data publication transaction complete; production build and full validation are required before commit");
