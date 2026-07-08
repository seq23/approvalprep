#!/usr/bin/env node
import fs from "node:fs";
import { walk, fail } from "./_common.mjs";
const files = walk("prompts").filter((file) => file.endsWith(".md"));
for (const file of files) {
  const text = fs.readFileSync(file, "utf8").toLowerCase();
  if (!text.includes("do not")) fail("[prompt-guardrails] missing do-not boundary in " + file);
  if (!text.includes("fake")) fail("[prompt-guardrails] missing fake document boundary in " + file);
}
console.log("[prompt-guardrails] OK");
