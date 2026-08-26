#!/usr/bin/env node
import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const generated = JSON.parse(fs.readFileSync("data/content/generated_answers.json", "utf8"));
const reports = JSON.parse(fs.readFileSync("data/reports/public_report_registry.json", "utf8"));
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const urls = new Set();
for (const route of manifest.routes.filter((route) => route.index && route.type !== "admin")) urls.add(`https://approvalprep.com${route.path === "/" ? "" : route.path}`);
for (const answer of generated.answers.filter((item) => item.status === "published_by_contract")) urls.add(`https://approvalprep.com/blog/${slugify(answer.title)}`);
for (const report of reports.reports.filter((item) => item.status === "published_by_contract")) urls.add(`https://approvalprep.com${report.path}`);
for (const path of ["/feed.xml", "/content-index.json", "/citation-targets.json", "/answers/index.json", "/llms.txt", "/llms-full.txt"]) urls.add(`https://approvalprep.com${path}`);
// These URLs come from data records rather than files, and none of the records
// carries its own date, so the honest lastmod is the last commit of the manifest
// that declares the URL. It is coarser than a per-page date but it is true: it
// says when that content set last changed. Emitting nothing at all - which is
// what this did - leaves a crawler no freshness signal, and recency is the
// strongest single correlate of being cited by an answer engine. Stamping build
// time instead would claim every page changed on every deploy.
import { execFileSync } from "node:child_process";
const commitDate = (file) => {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : "";
  } catch { return ""; }
};
const sourceDate = {
  route: commitDate("data/routes/route_manifest.json"),
  blog: commitDate("data/content/generated_answers.json"),
  report: commitDate("data/reports/public_report_registry.json"),
};
const dateFor = (url) => (url.includes("/blog/") ? sourceDate.blog
  : reports.reports.some((r) => url.endsWith(r.path)) ? sourceDate.report
  : sourceDate.route);
const body = [...urls].sort().map((url) => {
  const mod = dateFor(url);
  return `  <url><loc>${url}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ""}</url>`;
}).join("\n");
fs.writeFileSync("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
console.log(`[sitemap] OK urls=${urls.size}`);
