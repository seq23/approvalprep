#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
for (const path of ["src/lib/schema.ts", "src/components/StructuredData.astro", "src/components/AuthorityGuidePage.astro", "src/pages/reports/document-readiness-index.astro", "src/pages/blog/[slug].astro"]) if (!fs.existsSync(path)) fail("[structured-data] missing " + path);
const base = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
if (!base.includes("StructuredData") || !base.includes("schema = []")) fail("[structured-data] BaseLayout not wired for schema prop");
const blogDetail = fs.readFileSync("src/pages/blog/[slug].astro", "utf8");
if (!blogDetail.includes("articleSchema") || !blogDetail.includes("breadcrumbSchema")) fail("[structured-data] original blog detail lacks article/breadcrumb schema");
const guide = fs.readFileSync("src/components/AuthorityGuidePage.astro", "utf8");
for (const token of ["articleSchema", "breadcrumbSchema", "faqSchema", "howToSchema"]) if (!guide.includes(token)) fail("[structured-data] authority guide missing " + token);
const report = fs.readFileSync("src/pages/reports/document-readiness-index.astro", "utf8");
if (!report.includes("articleSchema") || !report.includes("itemListSchema")) fail("[structured-data] report schema missing");
console.log("[structured-data] OK original-blog-and-approved-assets");
