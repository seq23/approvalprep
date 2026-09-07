#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { requireBuildOutput } from "./_common.mjs";

// --- Existing assertion, unchanged: the self-service credit boundary phrases -----
// must survive in the boundary data, the footer, and the catch-all page template.
const boundary = JSON.parse(fs.readFileSync("data/legal/self_service_boundary.json", "utf8"));
const footer = fs.readFileSync("src/components/SiteFooter.astro", "utf8");
const pages = fs.readFileSync("src/pages/[...slug].astro", "utf8");
for (const phrase of ["self-service tool", "do not repair credit", "do not contact", "promise any result"]) {
  const haystack = (boundary.footerBoundary + " " + boundary.creditBoundary + " " + footer + " " + pages).toLowerCase();
  if (!haystack.includes(phrase)) throw new Error(`Missing credit boundary phrase: ${phrase}`);
}

// --- Added assertion: the professional boundary block, per page ------------------
// The check above only proves some strings exist somewhere in the source. It
// passed while ~113 of 123 built pages carried no on-page statement that
// ApprovalPrep is not a lawyer or a licensed financial professional. What
// follows asserts that block route by route, so a new page cannot ship without
// it and the wording cannot quietly drop the parts that matter.

const data = JSON.parse(fs.readFileSync("data/legal/professional_boundary.json", "utf8"));

// Only genuinely authoritative, non-commercial sources may be cited here. A
// boundary block that sends people to a lead-generation site is worse than none.
const ALLOWED_HOSTS = new Set([
  "www.consumerfinance.gov",
  "consumer.ftc.gov",
  "www.ftc.gov",
  "www.sba.gov",
  "www.annualcreditreport.com",
  "www.hud.gov",
  "www.irs.gov",
]);

const familyNames = Object.keys(data.families || {});
if (!familyNames.includes("general")) throw new Error("[credit-boundary] professional_boundary.json needs a 'general' family as the fallback");

for (const [name, copy] of Object.entries(data.families)) {
  const where = `family '${name}'`;
  if (!copy.heading || copy.heading.trim().length < 8) throw new Error(`[credit-boundary] ${where} has no usable heading`);
  const body = String(copy.body || "");
  if (body.length < 120) throw new Error(`[credit-boundary] ${where} body is too thin to be a real boundary statement`);
  const lower = body.toLowerCase();
  if (!lower.includes("not a substitute")) throw new Error(`[credit-boundary] ${where} body must say it is not a substitute for a professional`);
  if (!/not a law firm|not a lawyer/.test(lower)) throw new Error(`[credit-boundary] ${where} body must say ApprovalPrep is not a law firm`);
  if (!/legal advice|legal or financial advice|legal, tax, or financial advice/.test(lower)) throw new Error(`[credit-boundary] ${where} body must disclaim legal/financial advice`);
  if (!Array.isArray(copy.resources) || copy.resources.length < 1) throw new Error(`[credit-boundary] ${where} must cite at least one authoritative resource`);
  for (const resource of copy.resources) {
    if (!resource.label || resource.label.trim().length < 8) throw new Error(`[credit-boundary] ${where} has a resource with no usable label`);
    let url;
    try { url = new URL(resource.url); } catch { throw new Error(`[credit-boundary] ${where} has an unparseable resource url: ${resource.url}`); }
    if (url.protocol !== "https:") throw new Error(`[credit-boundary] ${where} resource must be https: ${resource.url}`);
    if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error(`[credit-boundary] ${where} cites a non-authoritative host: ${url.hostname}`);
  }
}

// The block has to hang off the shared layout, inside <main>. If it were left to
// each page to opt in, coverage would rot back to where it started.
const component = fs.readFileSync("src/components/ProfessionalBoundaryBlock.astro", "utf8");
const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
if (!layout.includes("ProfessionalBoundaryBlock")) throw new Error("[credit-boundary] BaseLayout must render ProfessionalBoundaryBlock");
const mainBlock = layout.slice(layout.indexOf("<main>"), layout.indexOf("</main>"));
if (!mainBlock.includes("<ProfessionalBoundaryBlock")) throw new Error("[credit-boundary] ProfessionalBoundaryBlock must render inside <main>, not in the footer chrome");
if (!component.includes('data-boundary-block')) throw new Error("[credit-boundary] boundary block must carry the data-boundary-block marker");
if (!component.includes('rel="noopener"')) throw new Error("[credit-boundary] boundary resource links must use rel=\"noopener\"");
if (/nofollow|sponsored/.test(component)) throw new Error("[credit-boundary] editorial boundary citations must not be nofollow/sponsored");

// Resolve the family for every route the site actually publishes, the same way
// the component does, and prove each one lands on real copy.
const familyForPath = (pathname) => {
  const clean = String(pathname || "/").replace(/\/+$/, "") || "/";
  for (const rule of data.rules || []) if (new RegExp(rule.pattern).test(clean)) return rule.family;
  return "general";
};

const routes = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8")).routes.map((r) => r.path);
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const answers = JSON.parse(fs.readFileSync("data/content/generated_answers.json", "utf8")).answers
  .filter((a) => a.status === "published_by_contract")
  .map((a) => `/blog/${slugify(a.title)}`);

const excluded = new Set(data.excludedPaths || []);
const covered = [];
for (const route of [...routes, ...answers]) {
  if (excluded.has(route.replace(/\/+$/, "") || "/")) continue;
  const family = familyForPath(route);
  if (!data.families[family]) throw new Error(`[credit-boundary] route ${route} resolves to unknown boundary family '${family}'`);
  covered.push(route);
}
if (covered.length < 100) throw new Error(`[credit-boundary] only ${covered.length} routes resolved a boundary family; expected the full published surface`);

// Confirm the block really reached the HTML rather than trusting that the layout
// wiring did its job.
//
// This sweep used to be wrapped in `if (fs.existsSync("dist"))`. On a bare
// checkout it therefore did nothing and the validator still exited 0, printing
// `builtPagesChecked=0` - the number that says it verified no page at all, in a
// line whose first word is OK. With the build present the same sweep checks 118.
// The build is validator 1 of the registry, so the tree is there in every lane
// that runs it; requiring it turns a silent skip into a named failure.
const DIST = requireBuildOutput("credit-boundary-coverage");
let distChecked = 0;
{
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const next = path.join(dir, e.name);
    return e.isDirectory() ? walk(next) : next.endsWith(".html") ? [next] : [];
  });
  const missing = [];
  for (const file of walk(DIST)) {
    const route = "/" + path.relative(DIST, file).replace(/index\.html$/, "").replace(/\/$/, "");
    const clean = route.replace(/\/+$/, "") || "/";
    // 404.html is assembled from the index shell by scripts/build_404.mjs and is
    // not a content page; /admin is an internal tool, excluded by the data file.
    if (excluded.has(clean) || clean === "/404.html") continue;
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes("data-boundary-block")) missing.push(clean);
    else distChecked += 1;
  }
  if (missing.length) throw new Error(`[credit-boundary] ${missing.length} built page(s) missing the professional boundary block: ${missing.slice(0, 10).join(", ")}`);
  if (distChecked === 0) throw new Error(`[credit-boundary] zero built pages carried the boundary block check in ${DIST}/ - the published tree is empty or entirely excluded, so this validator verified nothing`);
}

console.log(`[validate:credit-boundary] OK routes=${covered.length} builtPagesChecked=${distChecked} families=${familyNames.length}`);
