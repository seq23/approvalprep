#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
for (const path of ["src/pages/feed.xml.ts", "src/pages/content-index.json.ts", "src/pages/citation-targets.json.ts", "src/pages/answers/index.json.ts", "src/pages/llms.txt.ts", "src/pages/llms-full.txt.ts", "src/pages/blog/[slug].astro", "scripts/content/generate-candidate.mjs"]) {
  if (!fs.existsSync(path)) fail("[discovery-surfaces] missing " + path);
}
const sitemap = fs.existsSync("public/sitemap.xml") ? fs.readFileSync("public/sitemap.xml", "utf8") : "";
for (const required of ["https://approvalprep.com/blog</loc>", "/feed.xml", "/content-index.json", "/citation-targets.json", "/llms-full.txt", "/employment-verification-letter", "/609-dispute-letter", "/reports/document-readiness-index"]) {
  if (!sitemap.includes(required)) fail("[discovery-surfaces] sitemap missing " + required);
}
const retiredRedirects = JSON.parse(fs.readFileSync("data/routes/redirects.json", "utf8")).redirects || [];
for (const redirect of retiredRedirects) {
  if (sitemap.includes(`https://approvalprep.com${redirect.source}`)) fail(`[discovery-surfaces] retired duplicate blog URL remains in sitemap: ${redirect.source}`);
}
const llms = fs.readFileSync("src/pages/llms-full.txt.ts", "utf8");
if (!llms.includes("Published Blog Answer Pages")) fail("[discovery-surfaces] llms-full missing original published blog answer section");
console.log("[discovery-surfaces] OK publishing-system=preserved retired-duplicates=excluded");
