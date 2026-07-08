#!/usr/bin/env node
import fs from "node:fs";
const contract = JSON.parse(fs.readFileSync("data/governance/plain_language_contract.json", "utf8"));
const text = ["src/pages/index.astro", "src/components/SiteFooter.astro", "src/components/BoundaryNotice.astro"].map((f) => fs.readFileSync(f, "utf8")).join("\n").toLowerCase();
for (const hard of Object.keys(contract.bannedComplexWords)) {
  if (text.includes(hard.toLowerCase())) throw new Error(`Complex public word remains: ${hard}`);
}
if (!contract.target.includes("6th grade")) throw new Error("Plain-language contract missing 6th grade target");
console.log("[validate:plain-language-grade] OK");
