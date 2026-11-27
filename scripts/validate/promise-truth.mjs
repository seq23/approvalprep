#!/usr/bin/env node
// Promise truth (promise audit, 27 Nov 2026). Each check reads the BUILT page a person sees (dist/)
// and fails when a promise the page makes is false there again:
//   - /templates and /reports list every published item, folded ones included, and each link
//     lands on a page that holds the item's anchor ("All 0 ... previews" shipped for a month);
//   - every free checklist and every folded preview/report names its kit and that kit's price;
//   - the glossary shows every term in data/content/glossary.json (it promised reviewers' terms
//     and showed three);
//   - the /pricing comparison has one row per kit and the bundle ("compare all" showed four kits);
//   - the home page links its cost breakdown to a page that exists (it said "planned");
//   - /resources links every policy page in the route manifest;
//   - /questions says no person reads each page first, and so do the AI use and editorial policies
//     (the site said regulated answers wait for review while question pages auto-publish);
//   - the store text's "any of N situations" equals the Studio's real situation count;
//   - none of the retired false sentences is back anywhere in dist/.
// Rule 0: no dist/ or zero pages read is a FAIL, never a pass.
import fs from "node:fs";
import path from "node:path";
import { withSeedPrices } from "../../src/lib/kitPrice.mjs";
import { studioSituations } from "../../src/lib/letterStudioCore.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const fail = [];
let checks = 0;
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const pageFile = (route) => path.join(dist, route.split("#")[0].replace(/^\//, ""), "index.html");
const page = (route) => {
  const file = pageFile(route);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
};
const check = (ok, message) => { checks += 1; if (!ok) fail.push(message); };
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&mdash;|&#8212;/g, "—").replace(/\s+/g, " ");

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("[promise-truth] FAIL no dist/index.html: run the build first (nothing was checked)");
  process.exit(1);
}

const products = withSeedPrices(read("data/products/products.json").products, read("data/products/seed_product_registry.json").products);
const cards = products.filter((p) => p.status === "active_paid" && p.stripe_enabled);
const kitFor = (sku) => cards.find((p) => p.sku === sku);
const kitLabel = (sku) => { const k = kitFor(sku); return k ? `View the ${k.name} — ${k.priceLabel}` : null; };

// 1-2. Section indexes list every published item and each link lands on its anchor.
for (const [route, items] of [["/templates", read("data/templates/template_registry.json").templates], ["/reports", read("data/reports/public_report_registry.json").reports]]) {
  const live = items.filter((i) => i.status === "published_by_contract" || (i.status === "consolidated_into_hub" && i.consolidatedInto));
  const html = page(route);
  check(html, `${route}: page missing from dist/`);
  if (!html) continue;
  check(live.length > 0, `${route}: the registry has no published item`);
  check(new RegExp(`All ${live.length} ApprovalPrep`).test(html), `${route}: heading does not read "All ${live.length} ApprovalPrep ..."`);
  for (const item of live) {
    const href = item.status === "consolidated_into_hub" ? `${item.consolidatedInto}/#${item.id}` : `${item.path}/`;
    check(html.includes(`href="${href}"`), `${route}: no link to ${href} (${item.id})`);
    const target = page(href);
    check(target, `${route}: ${href} has no page in dist/`);
    if (target && item.status === "consolidated_into_hub") {
      const at = target.indexOf(`id="${item.id}"`);
      check(at >= 0, `${href}: no element with id="${item.id}", so the link lands nowhere`);
      // 3. The folded item names its kit and price.
      const label = kitLabel(item.targetProductSku);
      const block = at >= 0 ? text(target.slice(at, target.indexOf("</article>", at))) : "";
      check(label && block.includes(label), `${href}: does not name its kit and price ("${label}")`);
    }
  }
}

// 4. Every free checklist names its kit and price.
const tools = read("data/tools/tool_registry.json").tools.filter((t) => t.status === "published_by_contract");
check(tools.length > 0, "tools: the registry has no published checklist");
for (const tool of tools) {
  const html = page(tool.path);
  check(html, `${tool.path}: page missing from dist/`);
  if (!html) continue;
  const label = kitLabel(tool.targetProductSku);
  check(label && text(html).includes(label), `${tool.path}: kit button does not name its kit and price ("${label}")`);
}

// 5. The glossary shows every term.
const terms = read("data/content/glossary.json").terms;
const glossary = page("/glossary") || "";
const shown = (glossary.match(/data-glossary-term/g) || []).length;
check(terms.length >= 10, `glossary: only ${terms.length} terms in data/content/glossary.json`);
check(shown === terms.length, `glossary: ${shown} terms shown, ${terms.length} in data/content/glossary.json`);
for (const t of terms) check(text(glossary).includes(t.term), `glossary: "${t.term}" not shown`);

// 6. Home: no "planned" page; the cost breakdown link resolves.
const home = page("/") || "";
check(!/class="ap-tag">\s*planned/i.test(home), "home: still labels a page as planned");
const cost = home.match(/href="(\/questions\/how-much-does-credit-repair-cost\/)"/);
check(cost && page(cost[1]), "home: the cost breakdown link is missing or its page is not in dist/");

// 7. /pricing compares every kit and the bundle.
const pricing = page("/pricing") || "";
const table = (pricing.match(/<table class="comparison-table">[\s\S]*?<\/table>/) || [""])[0];
for (const card of cards) check(table.includes(`href="/pricing/#${card.sku}"`), `pricing: comparison table has no row for ${card.sku}`);
check((table.match(/<tr>/g) || []).length === cards.length + 1, `pricing: comparison table rows != ${cards.length} products + header`);

// 8. /resources links every policy page.
const resources = page("/resources") || "";
const legal = read("data/routes/route_manifest.json").routes.filter((r) => r.type === "legal");
check(legal.length > 0, "resources: the route manifest lists no policy page");
// Read inside the page's own policy block: the site footer links some policies on every page, and
// that must not count as this page listing them.
const policyBlock = (resources.match(/data-content-block="policy-pages"[\s\S]*?<\/section>/) || [""])[0];
check(policyBlock, "resources: no policy-pages block");
for (const r of legal) check(policyBlock.includes(`href="${r.path}/"`), `resources: policy block has no link to ${r.path}`);
check(resources.includes('href="/questions/"'), "resources: no link to the question pages");

// 9. The review truth for question pages.
const questions = text(page("/questions") || "");
check(/No person reads each page before it goes live/.test(questions), "questions: hub does not say no person reads each page first");
check(/no person reading each one first/.test(text(page("/ai-use-policy") || "")), "ai-use-policy: does not say question pages publish with no person reading each one first");
check(/No person reads a question page before it goes live/.test(text(page("/editorial-policy") || "")), "editorial-policy: does not say no person reads a question page first");

// 10. Store text counts the Studio's real situations.
for (const rel of ["apps/mobile/store/en.md", "apps/mobile/store/google-play/full-description.txt"]) {
  const store = fs.readFileSync(path.join(root, rel), "utf8");
  const m = store.match(/any of (\d+) situations/);
  check(m && Number(m[1]) === studioSituations.length, `${rel}: says "any of ${m?.[1]} situations", the Studio has ${studioSituations.length}`);
}

// 11. Retired false sentences stay gone from everything a person or crawler reads.
const RETIRED = [
  "Instant verified download",
  "Compare the matching kit",
  "ApprovalPrep letter template previews\">All 0",
  "must remain governed until reviewed",
  "The Blog is the public index for daily",
  "Every kit follows the same order, which is clarify",
  "lists the sources it was built from",
  "It covers every letter after the first",
  "extra review on credit, legal, and lending",
  "should be reviewed before sensitive public publication",
  "automatically approved for public use",
  "Use the same email address you bought with",
  "ends with what to prepare next",
  "editable DOCX files covering",
  "Owned methodology and boundary sources are tracked",
  "Each page below covers one situation end to end",
  "product fit, not an arbitrary 2MB",
];
let files = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(html|txt|json|xml)$/.test(entry.name)) {
      files += 1;
      const body = fs.readFileSync(full, "utf8");
      for (const old of RETIRED) if (body.includes(old)) fail.push(`${path.relative(root, full)}: retired claim is back: "${old}"`);
    }
  }
};
walk(dist);
check(files > 100, `retired-claims sweep read only ${files} files in dist/`);

if (fail.length) {
  console.error(`[promise-truth] FAIL ${fail.length} of ${checks} checks (+ ${files} files swept):`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`[promise-truth] OK ${checks} checks, ${files} built files swept for ${RETIRED.length} retired claims`);
