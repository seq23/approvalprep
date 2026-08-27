#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
for (const path of ["src/pages/feed.xml.ts", "src/pages/content-index.json.ts", "src/pages/citation-targets.json.ts", "src/pages/answers/index.json.ts", "src/pages/llms.txt.ts", "src/pages/llms-full.txt.ts", "src/pages/blog/[slug].astro", "scripts/content/generate-candidate.mjs"]) {
  if (!fs.existsSync(path)) fail("[discovery-surfaces] missing " + path);
}
const sitemap = fs.existsSync("public/sitemap.xml") ? fs.readFileSync("public/sitemap.xml", "utf8") : "";
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
// The build emits directory output, so Cloudflare Pages serves `/foo/` with a
// 200 and 308-redirects `/foo`. This validator used to require the redirecting
// form, which is why the defect survived: the sitemap and the check agreed with
// each other and both disagreed with the server.
const canonical = (path) => `https://approvalprep.com${new URL(path, "https://approvalprep.com").pathname.replace(/\/+$/, "")}/`;
for (const required of ["/blog", "/employment-verification-letter", "/609-dispute-letter", "/reports/document-readiness-index"]) {
  if (!locs.has(canonical(required))) fail("[discovery-surfaces] sitemap missing " + canonical(required));
}
for (const loc of locs) {
  if (!loc.endsWith("/")) fail(`[discovery-surfaces] sitemap entry names the 308-redirecting URL form: ${loc}`);
  if (/\.(json|xml|txt|pdf|docx)$/i.test(new URL(loc).pathname)) fail(`[discovery-surfaces] sitemap lists a non-HTML file; a sitemap lists indexable pages: ${loc}`);
}
const retiredRedirects = JSON.parse(fs.readFileSync("data/routes/redirects.json", "utf8")).redirects || [];
for (const redirect of retiredRedirects) {
  if (locs.has(canonical(redirect.source))) fail(`[discovery-surfaces] retired duplicate blog URL remains in sitemap: ${redirect.source}`);
}
const llms = fs.readFileSync("src/pages/llms-full.txt.ts", "utf8");
if (!llms.includes("Published Blog Answer Pages")) fail("[discovery-surfaces] llms-full missing original published blog answer section");
console.log("[discovery-surfaces] OK publishing-system=preserved retired-duplicates=excluded");
