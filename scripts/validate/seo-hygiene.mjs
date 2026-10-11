#!/usr/bin/env node
/**
 * SEO hygiene guards over the BUILT site (dist/). One check per item, each
 * registered as its own validator in _repo_validation_registry.json:
 *
 *   favicon       favicon.ico (16/32/48), apple-touch-icon 180, manifest icons,
 *                 and the <link> tags on every page
 *   og-image      og.png is a real 1200x630 PNG; every page names it with
 *                 width/height, and twitter:card is summary_large_image
 *   jsonld        JSON-LD types per page kind: Organization everywhere; WebSite +
 *                 speakable WebPage on /; BreadcrumbList on every inner sitemap
 *                 page; FAQPage wherever an FAQ block renders and nowhere its
 *                 questions are not visible; Product + Offer on kit pages with
 *                 the price visible on the page
 *   definition    the homepage paragraph directly under the H1 starts
 *                 "ApprovalPrep is", runs 40-60 words, and every speakable
 *                 cssSelector resolves on the page
 *   indexability  legal/utility and thank-you pages are noindex,follow and out of
 *                 the sitemap; every sitemap URL is indexable, self-canonical and
 *                 reachable from / by links
 *   indexnow      the IndexNow key file is served at /<key>.txt with the key the
 *                 submitter reads
 *
 * Usage: node scripts/validate/seo-hygiene.mjs <check>   (or `all`)
 * Every check hard-fails on zero items, so an empty dist/ cannot pass.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const ORIGIN = "https://approvalprep.com";
const LEGAL_NOINDEX = ["/privacy", "/terms", "/disclaimer", "/security", "/refund-policy", "/accessibility", "/credit-repair-disclaimer"];

const errors = [];
const fail = (msg) => errors.push(msg);
const norm = (p) => (String(p || "").replace(/\/+$/, "") || "/");

function pages() {
  if (!fs.existsSync(DIST)) throw new Error("dist/ missing - run npm run build first");
  const out = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "index.html") out.set(norm("/" + path.relative(DIST, dir).split(path.sep).join("/")), fs.readFileSync(full, "utf8"));
    }
  };
  walk(DIST);
  return out;
}
const sitemapUrls = () => [...fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => norm(m[1].replace(ORIGIN, "")));
const head = (html) => html.split(/<\/head>/i)[0];
const meta = (html, attr, name) => {
  const re = new RegExp(`<meta[^>]*${attr}="${name.replace(/[:]/g, "\\:")}"[^>]*>`, "i");
  const tag = head(html).match(re)?.[0];
  return tag ? (tag.match(/content="([^"]*)"/i)?.[1] ?? "") : null;
};
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const visibleText = (html) => decode(html.replace(/<head[\s\S]*?<\/head>/i, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const squash = (s) => decode(String(s)).replace(/\s+/g, " ").trim();
function jsonld(html, where) {
  const nodes = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const stack = [data];
      while (stack.length) {
        const n = stack.pop();
        if (Array.isArray(n)) stack.push(...n);
        else if (n && typeof n === "object") {
          if (n["@graph"]) stack.push(n["@graph"]);
          if (n["@type"]) nodes.push(n);
        }
      }
    } catch (e) { fail(`[jsonld] ${where}: unparseable JSON-LD block (${e.message})`); }
  }
  return nodes;
}
const topTypes = (html, where) => {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const d = JSON.parse(m[1]); for (const n of [].concat(d["@graph"] || d)) out.push(n); } catch { /* reported by jsonld() */ }
  }
  return out;
};
function png(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}
function icoSizes(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt16LE(0) !== 0 || b.readUInt16LE(2) !== 1) return null;
  const sizes = [];
  for (let i = 0; i < b.readUInt16LE(4); i++) sizes.push(b[6 + i * 16] || 256);
  return sizes.sort((a, z) => a - z);
}

const checks = {
  favicon(all) {
    const ico = path.join(DIST, "favicon.ico");
    if (!fs.existsSync(ico)) return fail("[favicon] dist/favicon.ico missing");
    const sizes = icoSizes(ico);
    for (const s of [16, 32, 48]) if (!sizes?.includes(s)) fail(`[favicon] favicon.ico lacks a ${s}px image (has ${sizes})`);
    const expect = { "apple-touch-icon.png": 180, "favicon-32x32.png": 32 };
    let manifest;
    try { manifest = JSON.parse(fs.readFileSync(path.join(DIST, "site.webmanifest"), "utf8")); } catch (e) { return fail(`[favicon] site.webmanifest missing or invalid: ${e.message}`); }
    if (!manifest.name || !manifest.theme_color || !manifest.start_url) fail("[favicon] site.webmanifest needs name, start_url and theme_color");
    if (!(manifest.icons || []).length) fail("[favicon] site.webmanifest declares no icons");
    for (const icon of manifest.icons || []) expect[icon.src.replace(/^\//, "")] = Number(String(icon.sizes).split("x")[0]);
    for (const [file, size] of Object.entries(expect)) {
      const f = path.join(DIST, file);
      const dim = fs.existsSync(f) && png(f);
      if (!dim) fail(`[favicon] ${file} missing or not a PNG`);
      else if (dim.width !== size || dim.height !== size) fail(`[favicon] ${file} is ${dim.width}x${dim.height}, expected ${size}x${size}`);
    }
    let n = 0;
    for (const [p, html] of all) {
      const h = head(html);
      if (!/<link rel="icon" href="\/favicon\.ico"/.test(h)) fail(`[favicon] ${p}: no <link rel="icon" href="/favicon.ico">`);
      if (!/<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/.test(h)) fail(`[favicon] ${p}: no apple-touch-icon link`);
      if (!/<link rel="manifest" href="\/site\.webmanifest"/.test(h)) fail(`[favicon] ${p}: no manifest link`);
      n++;
    }
    return n;
  },
  "og-image"(all) {
    const f = path.join(DIST, "og.png");
    const dim = fs.existsSync(f) && png(f);
    if (!dim) fail("[og-image] dist/og.png missing or not a PNG");
    else if (dim.width !== 1200 || dim.height !== 630) fail(`[og-image] og.png is ${dim.width}x${dim.height}, expected 1200x630`);
    let n = 0;
    for (const [p, html] of all) {
      const img = meta(html, "property", "og:image");
      if (!img) { fail(`[og-image] ${p}: no og:image`); continue; }
      if (!img.startsWith(ORIGIN + "/")) fail(`[og-image] ${p}: og:image ${img} is not served from ${ORIGIN}`);
      const local = path.join(DIST, img.slice(ORIGIN.length));
      const d = fs.existsSync(local) && png(local);
      if (!d) fail(`[og-image] ${p}: og:image ${img} has no PNG in dist/`);
      else if (meta(html, "property", "og:image:width") !== String(d.width) || meta(html, "property", "og:image:height") !== String(d.height)) fail(`[og-image] ${p}: og:image:width/height do not match the ${d.width}x${d.height} file`);
      if (meta(html, "name", "twitter:card") !== "summary_large_image") fail(`[og-image] ${p}: twitter:card is not summary_large_image`);
      if (meta(html, "name", "twitter:image") !== img) fail(`[og-image] ${p}: twitter:image does not match og:image`);
      n++;
    }
    return n;
  },
  jsonld(all) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data/routes/route_manifest.json"), "utf8"));
    const productPaths = manifest.routes.filter((r) => r.page_intent === "product" && r.index).map((r) => norm(r.path));
    if (!productPaths.length) fail("[jsonld] no indexable product routes found in the manifest");
    const sitemap = new Set(sitemapUrls());
    let n = 0;
    for (const [p, html] of all) {
      const nodes = jsonld(html, p);
      const top = topTypes(html, p);
      const has = (t) => top.some((x) => [].concat(x["@type"]).includes(t));
      const text = visibleText(html);
      if (!has("Organization")) fail(`[jsonld] ${p}: no Organization`);
      if (p === "/") {
        if (!has("WebSite")) fail("[jsonld] /: no WebSite");
        const wp = top.find((x) => x["@type"] === "WebPage");
        if (!wp) fail("[jsonld] /: no WebPage");
        else if (wp.speakable?.["@type"] !== "SpeakableSpecification" || !(wp.speakable.cssSelector || []).length) fail("[jsonld] /: WebPage has no SpeakableSpecification with cssSelector");
      } else if (sitemap.has(p) && !has("BreadcrumbList")) fail(`[jsonld] ${p}: inner sitemap page has no BreadcrumbList`);
      const faqs = nodes.filter((x) => x["@type"] === "FAQPage");
      if (/data-content-block="faq"/.test(html) && !faqs.length) fail(`[jsonld] ${p}: renders an FAQ block but has no FAQPage`);
      for (const faq of faqs) {
        if (!(faq.mainEntity || []).length) fail(`[jsonld] ${p}: FAQPage with no questions`);
        for (const q of faq.mainEntity || []) if (!text.includes(squash(q.name))) fail(`[jsonld] ${p}: FAQPage question not visible on the page: "${squash(q.name).slice(0, 70)}"`);
      }
      for (const product of nodes.filter((x) => x["@type"] === "Product")) {
        for (const offer of [].concat(product.offers || [])) {
          const price = String(offer.price || "").replace(/\.0+$/, "");
          if (!price || !text.includes(`$${price}`)) fail(`[jsonld] ${p}: Product offer price $${price} is not shown on the page`);
        }
      }
      if (productPaths.includes(p) && !nodes.some((x) => x["@type"] === "Product" && x.offers)) fail(`[jsonld] ${p}: kit page has no Product with Offer`);
      n++;
    }
    return n;
  },
  definition(all) {
    const html = all.get("/");
    if (!html) return fail("[definition] dist/index.html missing");
    const after = html.split(/<\/h1>/i)[1];
    if (!after) return fail("[definition] homepage has no H1");
    const first = after.match(/^\s*<p([^>]*)>([\s\S]*?)<\/p>/i);
    if (!first) return fail("[definition] the element directly under the H1 is not a paragraph");
    const id = first[1].match(/id="([^"]+)"/)?.[1];
    const words = squash(first[2].replace(/<[^>]+>/g, " ")).split(" ").filter(Boolean);
    if (!/^ApprovalPrep is\b/.test(words.join(" "))) fail(`[definition] paragraph under the H1 must start "ApprovalPrep is" (starts "${words.slice(0, 4).join(" ")}")`);
    if (words.length < 40 || words.length > 60) fail(`[definition] definition is ${words.length} words; must be 40-60`);
    const wp = topTypes(html, "/").find((x) => x["@type"] === "WebPage");
    const selectors = wp?.speakable?.cssSelector || [];
    if (!selectors.length) fail("[definition] no speakable cssSelector on the homepage WebPage");
    if (!id || !selectors.includes(`#${id}`)) fail(`[definition] speakable cssSelector does not name the definition paragraph (#${id || "no-id"})`);
    for (const sel of selectors) {
      const ok = sel.startsWith("#") ? new RegExp(`\\sid="${sel.slice(1)}"`).test(html)
        : sel.startsWith(".") ? new RegExp(`class="[^"]*\\b${sel.slice(1)}\\b`).test(html)
        : /^[a-z][a-z0-9]*$/i.test(sel) ? new RegExp(`<${sel}[\\s>]`, "i").test(html.split(/<body/i)[1] || "")
        : false;
      if (!ok) fail(`[definition] speakable selector "${sel}" does not resolve on the homepage`);
    }
    return 1;
  },
  indexability(all) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data/routes/route_manifest.json"), "utf8"));
    const thankYou = manifest.routes.filter((r) => /thank|success/.test(r.path)).map((r) => norm(r.path));
    const urls = sitemapUrls();
    if (urls.length < 50) fail(`[indexability] sitemap has ${urls.length} URLs; expected the full content set`);
    const inSitemap = new Set(urls);
    for (const p of [...LEGAL_NOINDEX, ...thankYou]) {
      const html = all.get(p);
      if (!html) { fail(`[indexability] ${p} not built`); continue; }
      const robots = meta(html, "name", "robots") || "";
      if (!/noindex/.test(robots) || !/(^|,|\s)follow/.test(robots)) fail(`[indexability] ${p}: robots is "${robots}", expected noindex,follow`);
      if (inSitemap.has(p)) fail(`[indexability] ${p}: noindex page is listed in the sitemap`);
    }
    for (const u of urls) {
      const html = all.get(u);
      if (!html) { fail(`[indexability] sitemap URL ${u} has no built page`); continue; }
      if (/noindex/.test(meta(html, "name", "robots") || "")) fail(`[indexability] sitemap URL ${u} is noindex`);
      const canon = head(html).match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      if (norm((canon || "").replace(ORIGIN, "")) !== u) fail(`[indexability] sitemap URL ${u} canonicalises to ${canon}`);
    }
    // Reachability: every sitemap URL can be reached from / by following links.
    const links = new Map();
    for (const [p, html] of all) {
      const body = html.split(/<body/i)[1] || "";
      links.set(p, new Set([...body.matchAll(/href="([^"#?]*)/g)].map((m) => m[1].replace(ORIGIN, "")).filter((h) => h.startsWith("/") && !h.startsWith("//")).map(norm)));
    }
    const seen = new Set(["/"]); const queue = ["/"];
    while (queue.length) for (const next of links.get(queue.pop()) || []) if (all.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
    for (const u of urls) if (!seen.has(u)) fail(`[indexability] sitemap URL ${u} is not reachable from / by internal links`);
    return urls.length;
  },
  indexnow() {
    const keyFile = path.join(ROOT, "public/indexnow-key.txt");
    if (!fs.existsSync(keyFile)) return fail("[indexnow] public/indexnow-key.txt missing");
    const key = fs.readFileSync(keyFile, "utf8").trim();
    if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return fail(`[indexnow] key "${key}" is not 8-128 characters of [A-Za-z0-9-]`);
    const served = path.join(DIST, `${key}.txt`);
    if (!fs.existsSync(served)) fail(`[indexnow] dist/${key}.txt missing - the key location would 404`);
    else if (fs.readFileSync(served, "utf8").trim() !== key) fail(`[indexnow] dist/${key}.txt does not contain the key`);
    const submitter = fs.readFileSync(path.join(ROOT, "scripts/intelligence/submit-indexnow.mjs"), "utf8");
    if (!submitter.includes("public/indexnow-key.txt") || !submitter.includes("https://api.indexnow.org/indexnow")) fail("[indexnow] the submitter no longer reads public/indexnow-key.txt or posts to api.indexnow.org");
    return 1;
  }
};

const which = process.argv[2] || "all";
const names = which === "all" ? Object.keys(checks) : [which];
for (const name of names) if (!checks[name]) { console.error(`[seo-hygiene] unknown check "${name}"; one of ${Object.keys(checks).join(", ")}`); process.exit(2); }
let all;
try { all = pages(); } catch (e) { console.error(`[seo-hygiene] ${e.message}`); process.exit(1); }
if (!all.size) { console.error("[seo-hygiene] dist/ has no pages"); process.exit(1); }
const counts = {};
for (const name of names) counts[name] = checks[name](all) || 0;
for (const name of names) if (!counts[name]) fail(`[${name}] checked zero items`);
if (errors.length) {
  console.error(`[seo-hygiene] FAIL ${names.join(",")}: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 40)) console.error("  " + e);
  process.exit(1);
}
console.log(`[seo-hygiene] OK ${names.map((n) => `${n}=${counts[n]}`).join(" ")}`);
