#!/usr/bin/env node
// Phone layout guard: every built sitemap page, rendered in Chromium at 390 x 844,
// must fit the screen with no sideways scroll, and no `.shell` block may sit flush
// against the screen edge.
//
// Why (6 Nov 2026): the homepage ran 459 px wide and /pricing/ 446 px on phones
// (a 4-column grid rule placed after its phone override), and the breadcrumb trail
// sat at x=0 on every page (`margin: 0` cancelling `.shell`'s auto margins).
// `html { overflow-x: hidden }` hid both from a quick look, but iOS Safari still pans
// a page that is wider than the screen. So this check turns that overflow off
// before it measures.
//
// Rule 0: zero pages measured, or no browser, is a failure by name, never a pass.
//   node scripts/validate/phone-no-sideways-scroll.mjs              check dist/
//   node scripts/validate/phone-no-sideways-scroll.mjs --self-test  prove it catches both bugs
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";

const WIDTH = 390;
const EDGE_MIN = 8;
const DIST = path.resolve(process.env.PAGES_OUT_DIR || "dist");
const selfTest = process.argv.includes("--self-test");
const fail = (tag, why) => { console.error(`[phone-no-sideways-scroll] FAIL ${tag}: ${why}`); process.exit(1); };

let chromium;
try { ({ chromium } = await import("playwright")); } catch { fail("NO_BROWSER", "the playwright package is not installed (npm ci)"); }

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".xml": "application/xml", ".webp": "image/webp", ".jpg": "image/jpeg" };
function serve(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    else if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    if (!fs.existsSync(file)) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Runs in the page. Turns off the overflow that hides the bug, then measures.
function measure({ width, edgeMin }) {
  for (const el of [document.documentElement, document.body]) el.style.setProperty("overflow-x", "visible", "important");
  const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const inScroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return true; } return false; };
  const wide = [];
  const flush = [];
  for (const e of document.querySelectorAll("body *")) {
    if (e.closest("details:not([open])")) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(e).position === "fixed") continue;
    if (r.right > width + 1 && !inScroller(e)) wide.push(`${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/)[0] || ""} (right edge ${Math.round(r.right)}px)`);
    if (e.classList.contains("shell") && r.left < edgeMin) flush.push(`${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/).join(".")} (left edge ${Math.round(r.left)}px)`);
  }
  return { pageWidth, wide: wide.slice(0, 3), flush: flush.slice(0, 3) };
}

async function check(browser, base, paths) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 844 } });
  const problems = [];
  let measured = 0;
  for (const p of paths) {
    const res = await page.goto(base + p, { waitUntil: "load" });
    if (!res || res.status() !== 200) { problems.push(`${p}: HTTP ${res ? res.status() : "no response"}`); continue; }
    const m = await page.evaluate(measure, { width: WIDTH, edgeMin: EDGE_MIN });
    measured += 1;
    if (m.pageWidth > WIDTH) problems.push(`${p}: page is ${m.pageWidth}px wide at ${WIDTH}px (sideways scroll)${m.wide.length ? `; widest: ${m.wide.join(", ")}` : ""}`);
    if (m.flush.length) problems.push(`${p}: content flush against the screen edge: ${m.flush.join(", ")}`);
  }
  await page.close();
  return { measured, problems };
}

// Every lane that runs validate:all (pull_request and the scheduled ones) gets the
// browser the same way, from here, so a green pull request predicts a green schedule
// (validate:pre-merge-lane-parity). One bounded install, then one retry.
let browser;
try { browser = await chromium.launch(); } catch (first) {
  console.log("[phone-no-sideways-scroll] Chromium not installed here; installing it once (npx playwright install --with-deps chromium)");
  const install = spawnSync("npx", ["playwright", "install", "--with-deps", "chromium"], { stdio: "inherit", timeout: 300_000 });
  if (install.status !== 0) fail("NO_BROWSER", `the Chromium install exited ${install.status ?? "on timeout"}; first launch error: ${String(first.message).split("\n")[0]}`);
  try { browser = await chromium.launch(); } catch (e) { fail("NO_BROWSER", `Chromium did not start after install: ${String(e.message).split("\n")[0]}`); }
}

try {
  if (selfTest) {
    const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || "/tmp"), "phone-guard-"));
    const head = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{overflow-x:hidden}body{margin:0}.shell{width:min(1120px,calc(100% - 24px));margin:0 auto}</style>`;
    fs.writeFileSync(path.join(dir, "ok.html"), `${head}<div class="shell"><p>fits</p></div>`);
    fs.writeFileSync(path.join(dir, "wide.html"), `${head}<div class="shell" style="display:grid;grid-template-columns:repeat(4,110px);gap:12px"><p>a</p><p>b</p><p>c</p><p>d</p></div>`);
    fs.writeFileSync(path.join(dir, "flush.html"), `${head}<ol class="shell" style="margin:0">trail</ol>`);
    const server = await serve(dir);
    const base = `http://127.0.0.1:${server.address().port}`;
    const ok = await check(browser, base, ["/ok.html"]);
    const wide = await check(browser, base, ["/wide.html"]);
    const flush = await check(browser, base, ["/flush.html"]);
    server.close();
    if (ok.problems.length) fail("SELF_TEST", `a page that fits was flagged: ${ok.problems[0]}`);
    if (!wide.problems.some((x) => x.includes("sideways scroll"))) fail("SELF_TEST", "a 4-column grid wider than 390px under overflow-x:hidden was NOT caught");
    if (!flush.problems.some((x) => x.includes("flush"))) fail("SELF_TEST", "a .shell with margin:0 at the screen edge was NOT caught");
    console.log("[phone-no-sideways-scroll] SELF-TEST OK: catches a hidden 4-column overflow and a flush .shell; passes a page that fits");
  } else {
    const sitemap = path.join(DIST, "sitemap.xml");
    if (!fs.existsSync(sitemap)) fail("NO_BUILD", `${sitemap} missing: run the build first`);
    const paths = [...fs.readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    if (!paths.length) fail("ZERO_PAGES", "dist/sitemap.xml lists no pages");
    const server = await serve(DIST);
    const { measured, problems } = await check(browser, `http://127.0.0.1:${server.address().port}`, paths);
    server.close();
    if (!measured) fail("ZERO_PAGES", `0 of ${paths.length} sitemap pages could be measured`);
    if (problems.length) {
      console.error(problems.slice(0, 20).map((x) => `  - ${x}`).join("\n"));
      fail("PHONE_LAYOUT", `${problems.length} problem(s) across ${measured} pages at ${WIDTH}px`);
    }
    console.log(`[phone-no-sideways-scroll] OK pages=${measured} width=${WIDTH}px: no sideways scroll, nothing flush against the edge`);
  }
} finally {
  await browser.close();
}
