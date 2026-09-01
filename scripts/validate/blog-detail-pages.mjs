#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
const generated = JSON.parse(fs.readFileSync("data/content/generated_answers.json", "utf8"));
const redirects = JSON.parse(fs.readFileSync("data/routes/redirects.json", "utf8")).redirects || [];
const redirectBySource = new Map(redirects.map((item) => [item.source, item.destination]));
if (!fs.existsSync("src/pages/blog/[slug].astro")) fail("[blog-detail-pages] missing /blog/[slug] route");
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const slugs = new Set();
let redirected = 0;
for (const answer of generated.answers) {
  if (!answer.id || !answer.title || !answer.route || !answer.status) fail("[blog-detail-pages] incomplete answer asset");
  const slug = slugify(answer.title);
  if (answer.status === "published_by_contract") {
    if (slugs.has(slug)) fail("[blog-detail-pages] duplicate published answer slug " + slug);
    slugs.add(slug);
  }
  if (answer.status === "redirected_to_canonical") {
    const source = `/blog/${answer.slug || slug}`;
    if (!answer.redirectTarget || redirectBySource.get(source) !== answer.redirectTarget) fail(`[blog-detail-pages] invalid retired redirect ${source}`);
    if (slugs.has(slug)) fail(`[blog-detail-pages] redirected answer escaped as public slug ${slug}`);
    redirected += 1;
  }
  if (answer.status !== "published_by_contract" && answer.riskLevel === "regulated" && slugs.has(slug)) fail("[blog-detail-pages] regulated review answer got public slug " + slug);
}
// Floor, not an exact count, for the same reason scripts/validate/redirect-map.mjs
// uses one: consolidating another templated duplicate is normal maintenance and
// must not fail the build, while silently losing a retirement - which would put
// a nonsense page back in the index - is the real regression.
const RETIRED_FLOOR = 42;
if (redirected < RETIRED_FLOOR) fail(`[blog-detail-pages] retired duplicate records regressed below floor ${RETIRED_FLOOR}, got ${redirected}`);
const blog = fs.readFileSync("src/pages/blog.astro", "utf8");
if (!blog.includes("/blog/${slugify(item.title)}")) fail("[blog-detail-pages] blog hub does not link to detail pages");
const detail = fs.readFileSync("src/pages/blog/[slug].astro", "utf8");
if (!detail.includes('item.status === "published_by_contract"')) fail("[blog-detail-pages] detail route no longer uses original public-status gate");
console.log(`[blog-detail-pages] OK published=${slugs.size} redirected=${redirected} publishingRoute=present`);
