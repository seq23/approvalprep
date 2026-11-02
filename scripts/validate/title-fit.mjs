#!/usr/bin/env node
// Behaviour guard for src/lib/title.mjs (owner ruling 2 Nov 2026: a long title
// never fails the build; the generator trims it). Runs the real fitTitle over
// every route title in the manifest plus fixed cases, and fails if any call
// throws, drops the ApprovalPrep brand, or returns more than TITLE_MAX chars.
// Hard-fails on zero titles examined.
import fs from "node:fs";
import { fitTitle, TITLE_MAX } from "../../src/lib/title.mjs";

const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const routes = Array.isArray(manifest) ? manifest : manifest.routes || [];
const titles = routes.map((r) => r.title || r.seo_title || r.h1).filter((t) => typeof t === "string" && t.trim());
const fixed = [
  "ApprovalPrep",
  "What should I know about a very long and winding mortgage underwriting letter of explanation for self-employed borrowers?",
  "Supercalifragilisticexpialidociousandevenlongerwordwithnospacesatallanywhereinsideitwhatsoever",
  "A long report title with no colon and no question form that keeps going well past the limit - ApprovalPrep Blog",
];
const errors = [];
let checked = 0;
for (const t of [...titles, ...fixed]) {
  checked++;
  let out;
  try { out = fitTitle(t); } catch (e) { errors.push(`threw on "${t}": ${e.message}`); continue; }
  if (out.length > TITLE_MAX) errors.push(`"${out}" is ${out.length} chars > ${TITLE_MAX}`);
  if (!/approvalprep/i.test(out)) errors.push(`"${out}" dropped the ApprovalPrep brand`);
}
if (titles.length === 0) errors.push("zero route titles found in data/routes/route_manifest.json");
if (errors.length) { console.error(`[title-fit] FAIL\n- ${errors.slice(0, 20).join("\n- ")}`); process.exit(1); }
console.log(`[title-fit] PASS ${checked} titles fitted within ${TITLE_MAX} chars with the brand kept`);
