#!/usr/bin/env node
// Pinterest launch (owner-approved 16 Oct 2026). Reads the BUILT output, so it
// runs after validator 1 (build). Fails if:
// - the homepage lost the Pinterest domain-claim meta tag;
// - dist/pinfeed.xml is not well-formed RSS 2.0, has < 8 items, or any item is
//   missing title (<=100) / link / description (<=500) / pubDate / enclosure /
//   media:content;
// - any link is off-site, a checkout/API URL, lacks the utm params, or points at
//   a page the build did not emit;
// - any image is off-site, missing from dist, or not a 1000x1500 PNG;
// - an active_paid kit or one of the three Plan B guides is missing from the feed;
// - public/_headers lost the application/rss+xml rule for /pinfeed.xml.
import fs from "node:fs";
import path from "node:path";
import sax from "sax";
import { SITE, FEED_PATH } from "../../src/lib/pinfeed.mjs";
import { paidSkusFrom } from "../../src/lib/skuForRoute.mjs";

const VERIFY = "d45778a613c69a5efaa46ee79ab687cc";
const UTM = ["utm_source=pinterest", "utm_medium=organic", "utm_campaign=pinfeed"];
const dist = path.resolve("dist");
const errors = [];
const fail = (m) => errors.push(m);

// 1. Domain claim on the built homepage.
const home = path.join(dist, "index.html");
if (!fs.existsSync(home)) fail("dist/index.html missing - build did not run");
else {
  const html = fs.readFileSync(home, "utf8");
  const head = html.split(/<\/head>/i)[0];
  if (!new RegExp(`<meta\\s+name="p:domain_verify"\\s+content="${VERIFY}"\\s*/?>`).test(head)) fail("homepage <head> lacks <meta name=\"p:domain_verify\" content=\"" + VERIFY + "\">");
}

// 2. Feed is well-formed XML.
const feedFile = path.join(dist, FEED_PATH);
let xml = "";
if (!fs.existsSync(feedFile)) fail(`dist${FEED_PATH} missing`);
else {
  xml = fs.readFileSync(feedFile, "utf8");
  const parser = sax.parser(true);
  let root = null;
  parser.onopentag = (n) => { if (!root) root = n; };
  parser.onerror = (e) => { fail(`feed is not well-formed XML: ${e.message.split("\n")[0]}`); parser.error = null; parser.close(); };
  try { parser.write(xml).close(); } catch (e) { fail(`feed parse threw: ${e.message}`); }
  if (root && (root.name !== "rss" || root.attributes.version !== "2.0")) fail("feed root is not <rss version=\"2.0\">");
}

const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`)); return m ? unesc(m[1]) : null; };
const attr = (block, name, a) => { const m = block.match(new RegExp(`<${name}\\s[^>]*${a}="([^"]*)"`)); return m ? unesc(m[1]) : null; };
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
if (items.length < 8) fail(`feed has ${items.length} items, need >= 8`);

const pageExists = (p) => fs.existsSync(path.join(dist, p, "index.html")) || fs.existsSync(path.join(dist, p));
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const linkedPaths = new Set();
for (const [i, it] of items.entries()) {
  const label = `item ${i + 1}`;
  const title = tag(it, "title"), link = tag(it, "link"), desc = tag(it, "description"), pub = tag(it, "pubDate");
  if (!title) fail(`${label}: no <title>`); else if (title.length > 100) fail(`${label}: title ${title.length} chars > 100`);
  if (!desc) fail(`${label}: no <description>`); else if (desc.length > 500) fail(`${label}: description ${desc.length} chars > 500`);
  if (!pub || Number.isNaN(Date.parse(pub))) fail(`${label}: missing or invalid <pubDate>`);
  if (!link) { fail(`${label}: no <link>`); continue; }
  let u;
  try { u = new URL(link); } catch { fail(`${label}: link not a URL: ${link}`); continue; }
  if (u.origin !== SITE) fail(`${label}: link off-site: ${link}`);
  if (/checkout|\/api\/|stripe|buy\.|gumroad|lemonsqueezy/i.test(link)) fail(`${label}: link is a checkout/API URL: ${link}`);
  for (const p of UTM) if (!u.search.includes(p)) fail(`${label}: link lacks ${p}`);
  if (!pageExists(u.pathname)) fail(`${label}: ${u.pathname} not in built output`);
  linkedPaths.add(u.pathname.replace(/\/+$/, ""));
  const enc = attr(it, "enclosure", "url"), media = attr(it, "media:content", "url");
  if (!enc) fail(`${label}: no <enclosure url>`);
  if (!media) fail(`${label}: no <media:content url>`);
  for (const img of [enc, media].filter(Boolean)) {
    let iu; try { iu = new URL(img); } catch { fail(`${label}: image not a URL: ${img}`); continue; }
    if (iu.origin !== SITE) { fail(`${label}: image off-site: ${img}`); continue; }
    const f = path.join(dist, iu.pathname);
    if (!fs.existsSync(f)) { fail(`${label}: image ${iu.pathname} not in built output`); continue; }
    const s = pngSize(f);
    if (!s || s.w !== 1000 || s.h !== 1500) fail(`${label}: image ${iu.pathname} is ${s ? `${s.w}x${s.h}` : "not a PNG"}, need 1000x1500`);
  }
}

// 3. Coverage: every paid kit and the three Plan B guides, in the feed or in the
// daily drip queue (data/pinterest/queue.json). Once the drip passes 50 items the
// launch items roll out of the newest-50 window; the pages stay covered by their
// queued variants. A new kit with neither fails here: run npm run pinterest:refill -- --force.
for (const v of JSON.parse(fs.readFileSync("data/pinterest/queue.json", "utf8")).items || []) linkedPaths.add(v.path.replace(/\/+$/, ""));
const products = JSON.parse(fs.readFileSync("data/products/products.json", "utf8"));
const priority = Object.keys(JSON.parse(fs.readFileSync("data/content/priority_pages.json", "utf8")).pages || {});
const planB = ["/employment-verification-letter", "/sba-loan-checklist", "/how-to-get-approved-for-an-apartment"];
for (const p of planB) if (!priority.includes(p)) fail(`Plan B guide ${p} no longer in priority_pages.json - update this validator`);
const kits = paidSkusFrom(products);
if (kits.length === 0) fail("no active_paid kits found");
for (const sku of kits) if (!linkedPaths.has(`/${sku}`)) fail(`kit /${sku}/ missing from the feed and the drip queue`);
for (const p of planB) if (!linkedPaths.has(p)) fail(`Plan B guide ${p}/ missing from the feed`);

// 4. Content type rule.
const headers = fs.existsSync(path.join(dist, "_headers")) ? fs.readFileSync(path.join(dist, "_headers"), "utf8") : "";
if (!/^\/pinfeed\.xml\s*\n\s+Content-Type:\s*application\/rss\+xml/m.test(headers)) fail("dist/_headers lacks the /pinfeed.xml Content-Type: application/rss+xml rule");

if (errors.length) { console.error(`[pinterest-launch] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[pinterest-launch] OK meta tag present; ${items.length} feed items (${kits.length} kits + ${planB.length} guides), every link and 1000x1500 image on-site and built`);
