#!/usr/bin/env node
import fs from "node:fs";
import { fail, readJson } from "./_common.mjs";

const manifest = readJson("data/routes/route_manifest.json");
const route = manifest.routes.find((item) => item.path === "/letter-writing-studio");
if (!route || !route.index || !route.nav || route.page_intent !== "free_tool") fail("[letter-studio] route must be indexed, nav-enabled free_tool");

const page = fs.readFileSync("src/pages/letter-writing-studio.astro", "utf8");
const component = fs.readFileSync("src/components/LetterStudio.astro", "utf8");
const home = fs.readFileSync("src/pages/index.astro", "utf8");
const data = fs.readFileSync("src/data/letterStudio.ts", "utf8");
const combined = `${page}\n${component}\n${home}\n${data}`;

for (const token of ["$0", "No account", "does not store", "browser", "static templates", "Start for $0", "/letter-writing-studio"]) {
  if (!combined.includes(token)) fail(`[letter-studio] missing ${token}`);
}
for (const blocked of ["fetch(", "/api/", "openai", "anthropic", "gemini", "perplexity", "stripe", "type=\"file\"", "type='file'", "FormData", "localStorage", "sessionStorage", "indexedDB", "Supabase", "Firebase", "D1", "KV", "R2", "Resend"]) {
  if (component.includes(blocked) || data.includes(blocked)) fail(`[letter-studio] free Studio must remain $0 browser-only; found ${blocked}`);
}
for (const sku of ["letter-of-explanation", "income-employment-letter-kit", "credit-letter-kit", "rental-application-kit", "loan-prep-letter-kit", "business-funding-prep-kit", "life-admin-letter-kit", "complete-approvalprep-bundle"]) {
  if (!data.includes(sku)) fail(`[letter-studio] recommendation missing ${sku}`);
}
console.log("[letter-studio] OK");
