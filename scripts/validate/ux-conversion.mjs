#!/usr/bin/env node
import fs from "node:fs";
const files = ["src/pages/index.astro", "src/pages/[...slug].astro", "src/components/TrustBar.astro", "src/components/FinalCTA.astro", "src/components/BoundaryNotice.astro"];
const missing = files.filter((f) => !fs.existsSync(f));
if (missing.length) throw new Error(`Missing UX files: ${missing.join(", ")}`);
const index = fs.readFileSync("src/pages/index.astro", "utf8");
for (const token of ["Get your application documents ready", "Choose by situation", "Compare kits", "TrustBar", "FinalCTA", "BoundaryNotice"]) {
  if (!index.includes(token)) throw new Error(`Homepage missing UX token: ${token}`);
}
const footer = fs.readFileSync("src/components/SiteFooter.astro", "utf8");
const content = fs.readFileSync("src/data/content.ts", "utf8");
for (const token of ["footerGroups", "Products", "Legal", "Resources"]) {
  const haystack = token === "footerGroups" ? footer : content;
  if (!haystack.includes(token)) throw new Error(`Footer missing professional link token: ${token}`);
}
console.log("[validate:ux-conversion] OK");
