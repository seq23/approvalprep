#!/usr/bin/env node
// Folds the search loop's pages (seq23/search-loop writes them to questions/<slug>/index.html
// at the repo root) into the built site, after `astro build`:
//   - copies every live page in data/search-loop/pages.json into dist/questions/<slug>/;
//   - writes dist/assets/search-loop.css from the stylesheets the built homepage links, so the
//     engine's pages wear the site's own styles without a hashed file name in their HTML.
// Rule 0: a live ledger page whose file is missing is a hard failure, never a silent skip,
// and the census line says how many pages were folded.
import fs from "node:fs";
import path from "node:path";

const DIST = process.env.PAGES_OUT_DIR || "dist";
const ledgerFile = "data/search-loop/pages.json";
if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error(`[search-loop:fold] FAIL ${DIST}/index.html missing: run after astro build`);
  process.exit(1);
}
const book = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, "utf8")) : { pages: [] };
const live = (book.pages || []).filter((p) => p.status === "live");
const missing = [];
let folded = 0;
for (const page of live) {
  if (!fs.existsSync(page.rel)) { missing.push(page.rel); continue; }
  const out = path.join(DIST, page.rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(page.rel, out);
  folded++;
}
// The site stylesheet, under a stable name.
const home = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const hrefs = [...home.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"|<link[^>]+href="([^"]+\.css)"[^>]*rel="stylesheet"/g)].map((m) => m[1] || m[2]);
const css = hrefs.filter((h) => h.startsWith("/")).map((h) => fs.readFileSync(path.join(DIST, h), "utf8"));
const inline = [...home.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const extra = ".search-loop-page{max-width:46rem;margin:0 auto;padding:2rem 1.25rem 3rem}.search-loop-page .direct-answer{font-size:1.15rem}.search-loop-page .site-action{margin-top:2rem}";
fs.mkdirSync(path.join(DIST, "assets"), { recursive: true });
fs.writeFileSync(path.join(DIST, "assets/search-loop.css"), [...css, ...inline, extra].join("\n"));
if (missing.length) {
  console.error(`[search-loop:fold] FAIL ${missing.length} live page(s) in ${ledgerFile} have no file: ${missing.slice(0, 5).join(", ")}`);
  process.exit(1);
}
if (!css.length && !inline.length) {
  console.error("[search-loop:fold] FAIL the built homepage links no stylesheet; engine pages would ship unstyled");
  process.exit(1);
}
console.log(`[search-loop:fold] OK folded=${folded} live=${live.length} stylesheets=${css.length + inline.length}`);
