#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
const generated = JSON.parse(fs.readFileSync("data/content/generated_answers.json", "utf8"));
if (!fs.existsSync("src/pages/blog/[slug].astro")) fail("[blog-detail-pages] missing /blog/[slug] route");
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const slugs = new Set();
for (const answer of generated.answers) {
  if (!answer.id || !answer.title || !answer.route || !answer.status) fail("[blog-detail-pages] incomplete answer asset");
  const slug = slugify(answer.title);
  if (answer.status === "published_by_contract") {
    if (slugs.has(slug)) fail("[blog-detail-pages] duplicate published answer slug " + slug);
    slugs.add(slug);
  }
  if (answer.status !== "published_by_contract" && answer.riskLevel === "regulated" && slugs.has(slug)) fail("[blog-detail-pages] regulated review answer got public slug " + slug);
}
const blog = fs.readFileSync("src/pages/blog.astro", "utf8");
if (!blog.includes("/blog/${slugify(item.title)}")) fail("[blog-detail-pages] blog hub does not link to detail pages");
console.log(`[blog-detail-pages] OK published=${slugs.size}`);
