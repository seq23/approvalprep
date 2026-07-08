#!/usr/bin/env node
import { exists, fail } from "./_common.mjs";
const required = ["public/robots.txt", "public/_redirects", "public/indexnow-key.txt", "src/pages/llms.txt.ts", "src/pages/llms-full.txt.ts", "src/pages/answers/index.json.ts", "scripts/seo/generate-sitemap.mjs", "scripts/seo/submit-indexnow.mjs", "scripts/seo/submit-bing.mjs", "scripts/seo/gsc-submit-or-log.mjs", "data/seo/submission_registry.json", "data/seo/indexing_receipts.json"];
const missing = required.filter((file) => !exists(file));
if (missing.length) fail("[seo] missing " + missing.join(", "));
console.log("[seo] OK");
