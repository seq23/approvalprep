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
const body = [...urls].sort().map((url) => `  <url><loc>${url}</loc></url>`).join("\n");
fs.writeFileSync("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
console.log(`[sitemap] OK urls=${urls.size}`);
