#!/usr/bin/env node
import fs from "node:fs";
const files = ["src/pages/index.astro", "src/pages/[...slug].astro", "src/components/TrustBar.astro", "src/components/FinalCTA.astro", "src/components/BoundaryNotice.astro"];
const missing = files.filter((f) => !fs.existsSync(f));
if (missing.length) throw new Error(`Missing UX files: ${missing.join(", ")}`);
const index = fs.readFileSync("src/pages/index.astro", "utf8");
for (const token of ["Get your letters and documents ready", "TrustBar", "FinalCTA", "BoundaryNotice", "Start my letter"]) {
  if (!index.includes(token)) throw new Error(`Homepage missing UX token: ${token}`);
}
console.log("[validate:ux-conversion] OK");
