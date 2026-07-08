#!/usr/bin/env node
import fs from "node:fs";
import { walk, fail } from "./_common.mjs";
const banned = ["we rank #1", "we are indexed", "chatgpt cites us", "google cites us", "citation wins proven"];
for (const file of walk(".").filter((f) => /\.(md|json|astro|ts)$/.test(f) && !f.includes("node_modules") && !f.includes("dist"))) {
  const text = fs.readFileSync(file, "utf8").toLowerCase();
  for (const phrase of banned) if (text.includes(phrase)) fail("[telemetry] unsupported claim: " + phrase + " in " + file);
}
console.log("[telemetry] OK");
