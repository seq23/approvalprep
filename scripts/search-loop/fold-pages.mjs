#!/usr/bin/env node
// Folds the search loop's pages (seq23/search-loop writes them to questions/<slug>/index.html
// at the repo root) into the built site, after `astro build`:
//   - every live page in data/search-loop/pages.json is served inside the site's own shell:
//     the built /questions/ hub (BaseLayout: header, nav, footer with the self-service
//     boundary, favicons, Organization graph, analytics) with its <main>, title, description,
//     canonical, social tags and page graph swapped for the engine page's. The engine's file
//     in questions/ stays byte-for-byte what the engine wrote (its strengthen/undo hashes);
//   - writes dist/assets/search-loop.css from the stylesheets the built homepage links, the
//     stylesheet the engine's own file names.
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
const shellFile = path.join(DIST, "questions/index.html");
if (live.length && !fs.existsSync(shellFile)) {
  console.error(`[search-loop:fold] FAIL ${shellFile} missing: the /questions/ hub is the shell every engine page is served in`);
  process.exit(1);
}
const shell = live.length ? fs.readFileSync(shellFile, "utf8") : "";
const HEAD_SWAP = [
  /<title>[\s\S]*?<\/title>/i,
  /<meta name="description"[^>]*>/i,
  /<meta name="robots"[^>]*>/i,
  /<link rel="canonical"[^>]*>/i,
  /<meta property="og:(type|title|description|url)"[^>]*>/gi,
  /<meta name="twitter:(title|description)"[^>]*>/gi,
  /<script type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@type":"WebPage"[\s\S]*?<\/script>/i,
];
const pick = (html, re) => (html.match(re) || [])[0] || "";
const attr = (html, re) => (html.match(re) || [])[1];
const ORG_ID = "https://approvalprep.com/#organization";
// The same author every site Article carries (src/lib/schema.ts editorialAuthor):
// ApprovalPrep Editorial, a child of the one Spry Labs entity.
const editorial = JSON.parse(fs.readFileSync("src/data/editorial.json", "utf8"));
const parent = JSON.parse(fs.readFileSync("src/data/entity.json", "utf8")).parentOrganization;
const AUTHOR = {
  "@type": "Organization", name: editorial.name, url: `https://approvalprep.com${editorial.aboutPath}`,
  parentOrganization: { "@type": "Organization", "@id": parent["@id"], name: parent.name, url: parent.url },
};
const BOUNDARY = /<section[^>]*data-boundary-block[\s\S]*?<\/aside>\s*<\/div>\s*<\/section>|<section[^>]*data-boundary-block[\s\S]*?<\/section>/i;
// Head tags are rebuilt in the site's own attribute order (the site's validators read
// `rel="canonical" href=`), and the engine's Article names the site's one Organization by
// @id instead of describing a second, thinner copy of it.
export function wrap(shellHtml, page) {
  const v = {
    title: attr(page, /<title>([\s\S]*?)<\/title>/i),
    description: attr(page, /<meta content="([^"]*)" name="description"\/>/i),
    robots: attr(page, /<meta content="([^"]*)" name="robots"\/>/i),
    canonical: attr(page, /<link href="([^"]*)" rel="canonical"\/>/i),
    ogType: attr(page, /<meta content="([^"]*)" property="og:type"\/>/i),
  };
  const ld = attr(page, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  const article = pick(page, /<article class="search-loop-page">[\s\S]*?<\/article>/i);
  if (Object.values(v).some((x) => !x) || !ld || !article) return null;
  let graph;
  try { graph = JSON.parse(ld); } catch { return null; }
  for (const node of graph["@graph"] || []) {
    if (node["@type"] === "Article") { node.author = AUTHOR; node.publisher = { "@id": ORG_ID }; }
  }
  const head = [
    `<title>${v.title}</title>`,
    `<meta name="description" content="${v.description}">`,
    `<meta name="robots" content="${v.robots}">`,
    `<link rel="canonical" href="${v.canonical}">`,
    `<meta property="og:type" content="${v.ogType}">`,
    `<meta property="og:title" content="${v.title}">`,
    `<meta property="og:description" content="${v.description}">`,
    `<meta property="og:url" content="${v.canonical}">`,
    `<meta name="twitter:title" content="${v.title}">`,
    `<meta name="twitter:description" content="${v.description}">`,
  ];
  // After the shell's own graph: the first Organization a reader meets is the site's.
  const graphTag = `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>`;
  let out = shellHtml;
  for (const re of HEAD_SWAP) out = out.replace(re, "");
  const boundary = pick(shellHtml, BOUNDARY);
  if (!boundary) return null;
  out = out.replace(/<meta charset="utf-8">/i, (m) => `${m}${head.join("")}`);
  out = out.replace(/<\/head>/i, (m) => `${graphTag}${m}`);
  out = out.replace(/(<main[^>]*>)[\s\S]*?<\/main>/i, (_, open) => `${open}${article}${boundary}</main>`);
  return out;
}
const unwrapped = [];
for (const page of live) {
  if (!fs.existsSync(page.rel)) { missing.push(page.rel); continue; }
  const html = wrap(shell, fs.readFileSync(page.rel, "utf8"));
  if (!html) { unwrapped.push(page.rel); continue; }
  const out = path.join(DIST, page.rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  folded++;
}
if (unwrapped.length) {
  console.error(`[search-loop:fold] FAIL ${unwrapped.length} engine page(s) lack the head, graph or <article> the shell needs, or the shell lost its boundary block: ${unwrapped.slice(0, 5).join(", ")}`);
  process.exit(1);
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
