#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
for (const path of ["src/lib/schema.ts", "src/components/StructuredData.astro"]) if (!fs.existsSync(path)) fail("[structured-data] missing " + path);
const base = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
if (!base.includes("StructuredData") || !base.includes("schema = []")) fail("[structured-data] BaseLayout not wired for schema prop");
const blogDetail = fs.readFileSync("src/pages/blog/[slug].astro", "utf8");
if (!blogDetail.includes("articleSchema") || !blogDetail.includes("breadcrumbSchema")) fail("[structured-data] blog detail lacks article/breadcrumb schema");
console.log("[structured-data] OK");
