// What the phone app may open on the website (App Review 3.1.1): pages served in app view (?app=1,
// functions/_middleware.js) with no way onward to buying. One reader for the live check
// (scripts/ops/post-deploy-live-check.mjs) and the app's test (apps/mobile/tests/noWebSteering.test.ts).
import fs from "node:fs";

/** Every page the app opens, read from the app's own code: each appPage('/path/') in src/more.ts. */
export function appPagePaths(moreSource = fs.readFileSync(new URL("../../apps/mobile/src/more.ts", import.meta.url), "utf8")) {
  return [...new Set([...moreSource.matchAll(/appPage\('([^']+)'\)/g)].map((m) => m[1]))];
}

const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

/** Everything on a served page that leads a reader from the app toward buying; [] = clean. */
export function appViewProblems(html) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if (!/^(mailto|tel):/i.test(m[1])) out.push(`link onward: ${m[1]} "${text(m[2]).slice(0, 40)}"`);
  }
  for (const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    if (/\bbuy\b|checkout|add to cart|\$\s?\d/i.test(text(m[1]))) out.push(`buy button: "${text(m[1]).slice(0, 40)}"`);
  }
  for (const m of html.matchAll(/<form\b[^>]*action="([^"]*)"/gi)) {
    if (/checkout|stripe|buy/i.test(m[1])) out.push(`checkout form: ${m[1]}`);
  }
  if (/<(header|footer)\b[^>]*class="site-(header|footer)/i.test(html)) out.push("site menu or footer still shown");
  return out;
}
