#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { clampToPublicationBudget } from "../lib/publication_budget.mjs";
import { isAnswerableRoute } from "./answer-eligibility.mjs";
import { loadFreeze, measuredTargets, freezeDecision, STOP_CODE } from "../lib/publication_freeze.mjs";

fs.mkdirSync("data/content", { recursive: true });

const now = new Date().toISOString();
const releaseDate = process.env.CONTENT_RELEASE_DATE || now.slice(0, 10);
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const ledger = JSON.parse(fs.readFileSync("data/release/release_ledger.json", "utf8"));
const existingDocument = fs.existsSync("data/content/generated_answers.json")
  ? JSON.parse(fs.readFileSync("data/content/generated_answers.json", "utf8"))
  : { schemaVersion: "2.1.0", generatedAt: now, answers: [] };
const cadence = JSON.parse(fs.readFileSync("data/strategy/content_release_cadence.json", "utf8"));
const governor = JSON.parse(fs.readFileSync("data/authority_scale/velocity_governor.json", "utf8"));

function loadRouteCopy() {
  let src = fs.readFileSync("src/data/content.ts", "utf8");
  src = src.replace(/import productsData[^\n]+/, `const productsData = ${fs.readFileSync("data/products/products.json", "utf8")};`);
  src = src.replace(/import offeringData[^\n]+/, `const offeringData = ${fs.readFileSync("data/products/full_offering_catalog.json", "utf8")};`);
  src = src.replace(/import nextStepsData[^\n]+/, `const nextStepsData = ${fs.readFileSync("data/content/customer_next_steps.json", "utf8")};`);
  src = src.replace(/import boundaryData[^\n]+/, `const boundaryData = ${fs.readFileSync("data/legal/self_service_boundary.json", "utf8")};`);
  src = src.replace(/import generatedRouteCopyData[^\n]+/, `const generatedRouteCopyData = ${fs.readFileSync("data/content/generated_route_copy.json", "utf8")};`);
  src = src.replace(/export const /g, "const ");
  src += "\nresult = { routeCopy };";
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext(src, context);
  return context.result.routeCopy;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function asList(value, fallback) {
  return Array.isArray(value) && value.length ? value.slice(0, 6) : fallback;
}

// `Number(x || 3)` read a declared ceiling of 0 as 3: a deliberate "publish
// nothing today" setting in either registry was silently overridden by the
// default. A throttle that cannot express zero is not a throttle. Read the
// declared number when it is a usable number, and fall back only when it is
// absent or unparseable.
const declaredLimit = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
const cadenceLimit = declaredLimit(cadence.cadence?.dailyShortAnswers?.targetPerDay, 3);
const governorLimit = declaredLimit(governor.current_default_new_page_ceiling_per_day, 3);
const requestedLimit = declaredLimit(process.env.CONTENT_RELEASE_LIMIT, Math.min(cadenceLimit, governorLimit));
// The three limits above are this generator's own risk tiers. None of them is
// the number that is enforced: `npm run cadence:gate` blocks on
// data/cadence/policy.json new_pages_per_week, and all three of these sit above
// it. Publishing to a ceiling the gate will refuse produces a URL set that ships
// through the ungated paths and then blocks the gated one every day afterwards,
// because the ledger the gate measures against is only advanced by a run that
// cleared it. Clamp to the remaining headroom under the enforced cap.
const budgeted = clampToPublicationBudget(
  Math.max(0, Math.min(requestedLimit, cadenceLimit, governorLimit)),
  "content:generate",
);
const releaseLimit = budgeted.limit;
const releaseId = `content-release-${releaseDate}`;
const existingAnswers = Array.isArray(existingDocument.answers) ? existingDocument.answers : [];
const existingRelease = (ledger.releases || []).find((item) => item.id === releaseId);

if (existingRelease) {
  console.log(JSON.stringify({ status: "NOOP_ALREADY_RELEASED", releaseId, published: existingRelease.pagesPublished || 0 }, null, 2));
  process.exit(0);
}

const routeCopy = loadRouteCopy();
// `risk === "low"` and `index === true` say a route is safe to write about and
// worth indexing. Neither says the route is something a person prepares for,
// and every title here is a preparation question stamped onto route.title. That
// gap produced "How should I prepare for Pricing?" and four more like it: a
// question nobody asks, answered by a checklist unrelated to the page named.
// isAnswerableRoute() closes it on the manifest's own page_intent field.
const baseRoutes = manifest.routes
  .filter((route) => route.type === "public" && route.index && route.path !== "/" && route.risk === "low");
const answerableRoutes = baseRoutes.filter(isAnswerableRoute);
// A hub that absorbed its thin /blog/ answers (foldedIntoHub) must not grow new
// ones: each would be another sub-600-word page on the same subject, the exact
// pattern the consolidation removed.
const foldedHubs = new Set(existingAnswers.filter((answer) => answer.foldedIntoHub === true).map((answer) => answer.redirectTarget));
const lowRiskRoutes = answerableRoutes
  .filter((route) => !foldedHubs.has(route.path))
  .sort((a, b) => manifest.routes.indexOf(a) - manifest.routes.indexOf(b));

// A generator that silently selects nothing publishes nothing and reports
// success. If the manifest ever loses its page_intent values this must be loud:
// that is a broken input, so it stays a hard failure.
if (!answerableRoutes.length) {
  console.error("[content:generate] FAIL no answerable route survived page_intent eligibility; refusing to run an empty generation");
  process.exit(1);
}

// Answerable routes exist but every one is a hub that absorbed its answers
// (#57, 26 Oct 2026, folded all 8). That is a deliberate consolidation, not a
// broken input, and it used to share the hard failure above: the scheduled
// release went red on 27 Oct 2026 with nothing wrong. It ends as the NAMED STOP
// below instead: logged, annotated on the run page, and written to the ledger,
// with the measured-demand routes and their risk so the reader sees why the
// low-risk lane has nothing left to write about.
const NO_ELIGIBLE_STOP = "NO_ELIGIBLE_ANSWER_ROUTES";
let eligibilityStop = null;
if (!lowRiskRoutes.length) {
  const targetPaths = [...new Set([...measuredTargets().values()].map((target) => target.expected_owned_route).filter(Boolean))];
  const targetRisk = {};
  for (const path of targetPaths) {
    const risk = manifest.routes.find((item) => item.path === path)?.risk || "unrouted";
    targetRisk[risk] = (targetRisk[risk] || 0) + 1;
  }
  eligibilityStop = {
    code: NO_ELIGIBLE_STOP,
    answerableRoutes: answerableRoutes.length,
    foldedHubs: answerableRoutes.filter((route) => foldedHubs.has(route.path)).length,
    measuredTargetRoutesByRisk: targetRisk,
  };
  const message =
    `NAMED STOP ${NO_ELIGIBLE_STOP}: all ${eligibilityStop.answerableRoutes} answerable low-risk route(s) are hubs that ` +
    `absorbed their answers (foldedIntoHub in data/content/generated_answers.json), and the ` +
    `measured-demand routes in data/search_intelligence/target_query_set.json sit outside the low-risk lane ` +
    `(${JSON.stringify(targetRisk)}). Nothing is published today. It clears itself when a new low-risk ` +
    `guide/tool/template route that is not a folded hub enters data/routes/route_manifest.json.`;
  console.log(`[content:generate] ${message}`);
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(`::warning title=${NO_ELIGIBLE_STOP}::${message}`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Content release: ${NO_ELIGIBLE_STOP}\n\n${message}\n`);
  }
}

const variants = [
  {
    id: "know",
    title: (route) => `What should I know about ${route.title}?`,
    lead: (copy, route) => `${copy.shortAnswer || `${route.title} is a self-service preparation resource.`} Use it to organize truthful facts, dates, and supporting documents before you send anything yourself.`
  },
  {
    id: "gather",
    title: (route) => `What should I gather before using ${route.title}?`,
    lead: (copy, route) => `Before using ${route.title}, gather the exact request, a short timeline, and copies of documents that support each factual statement. Keep the packet focused on what a reviewer actually needs to understand.`
  },
  {
    id: "mistakes",
    title: (route) => `What mistakes should I avoid with ${route.title}?`,
    // The first sentence names the route. src/pages/blog/[slug].astro builds the
    // meta description from the opening sentences, and when this lead opened on a
    // fixed sentence every "mistakes" answer shipped the same description (8 pages
    // on 25 Sep 2026). scripts/validate/title-length.mjs fails a duplicate.
    lead: (copy, route) => `The biggest ${route.title} mistakes: unsupported claims, mismatched dates or amounts, and unexplained attachments. ${copy.shortAnswer || "Use the page as a preparation guide, not as a promise of approval."}`
  },
  {
    id: "prepare",
    title: (route) => `How should I prepare for ${route.title}?`,
    lead: (copy, route) => `Prepare for ${route.title} by clarifying the request, collecting real proof, drafting a short explanation, checking every date and amount, and saving a complete copy of what you send.`
  }
];

const existingIds = new Set(existingAnswers.map((item) => item.id).filter(Boolean));
const existingTitles = new Set(existingAnswers.map((item) => item.title).filter(Boolean));
const existingSlugs = new Set(existingAnswers.map((item) => item.slug || slug(item.title || "")).filter(Boolean));
const existingContentKeys = new Set(existingAnswers.map((item) => item.contentKey).filter(Boolean));
const existingHashes = new Set(existingAnswers.map((item) => item.contentHash).filter(Boolean));

for (const answer of existingAnswers) {
  for (const variant of variants) {
    const route = manifest.routes.find((item) => item.path === answer.route);
    if (route && answer.title === variant.title(route)) existingContentKeys.add(`${route.path}::${variant.id}`);
  }
}

const candidates = [];
for (const variant of variants) {
  for (const route of lowRiskRoutes) {
    const copy = routeCopy[route.path] || {};
    const title = variant.title(route);
    const pageSlug = slug(title);
    const contentKey = `${route.path}::${variant.id}`;
    const steps = asList(copy.steps, [
      "Clarify the exact request or decision you are preparing for.",
      "Gather documents that support each factual statement.",
      "Create a short timeline with checked dates, names, and amounts.",
      "Review the packet for truth, relevance, and completeness.",
      "Send the materials yourself and retain a complete copy."
    ]);
    const checklist = asList(copy.reviewChecklist || copy.prepBrief, [
      "Every statement is truthful and supportable.",
      "Dates, names, and amounts are consistent.",
      "Attachments directly support the explanation.",
      "Unsupported claims and unnecessary detail are removed."
    ]);
    const commonMistakes = asList(copy.commonMistakes, [
      "Sending a long story without supporting proof.",
      "Using language that sounds like a guarantee or threat.",
      "Forgetting to keep a complete copy trail."
    ]);
    const answer = variant.lead(copy, route);
    const contentHash = stableHash({ title, route: route.path, answer, steps, checklist, commonMistakes });
    const id = `daily-${releaseDate}-${String(candidates.length + 1).padStart(2, "0")}-${pageSlug}`;
    candidates.push({
      id,
      slug: pageSlug,
      title,
      route: route.path,
      riskLevel: "low",
      status: "published_by_contract",
      answer,
      steps,
      checklist,
      commonMistakes,
      boundary: "ApprovalPrep is self-service. It does not contact third parties, create fake documents, provide legal or financial advice, or repair credit. There is no guarantee of approval.",
      contentKey,
      contentHash,
      releaseId,
      publishedAt: `${releaseDate}T00:00:00.000Z`,
      generatedBy: "scheduled_content_release_v2"
    });
  }
}

// The publication freeze (data/cadence/policy.json new_page_publication): while
// it is on, only a candidate whose own query is a measured target may publish.
const freeze = loadFreeze();
const targets = measuredTargets();
const heldByFreeze = [];
const selected = [];
for (const candidate of candidates) {
  if (selected.length >= releaseLimit) break;
  const decision = freezeDecision(candidate, freeze, targets);
  if (!decision.allowed) { heldByFreeze.push(candidate.title); continue; }
  if (existingContentKeys.has(candidate.contentKey)) continue;
  if (existingTitles.has(candidate.title)) continue;
  if (existingSlugs.has(candidate.slug)) continue;
  if (existingHashes.has(candidate.contentHash)) continue;
  if (existingIds.has(candidate.id)) continue;
  selected.push(candidate);
  existingContentKeys.add(candidate.contentKey);
  existingTitles.add(candidate.title);
  existingSlugs.add(candidate.slug);
  existingHashes.add(candidate.contentHash);
  existingIds.add(candidate.id);
}

// Zero published has two entirely different causes and they must not share a
// label. `no_distinct_low_risk_inventory` means the backlog is exhausted - every
// low-risk route/variant pair is already written. A publication budget of 0 means
// the inventory is fine and the enforced weekly cap has simply been spent, which
// is deliberate throttling, not exhaustion. Recording the cap-spent case as
// exhaustion put a false reason in data/release/release_ledger.json every day the
// cap bound, and left the exhaustion assertion in validate:content-release
// passing on a condition it was not testing.
const budgetExhausted = selected.length === 0 && releaseLimit === 0 && budgeted.budget.remaining === 0;
if (budgetExhausted) {
  console.log(
    `[content:generate] NAMED STOP no_publication_budget: the enforced cap in data/cadence/policy.json ` +
    `(new_pages_per_week=${budgeted.budget.cap}) has ${budgeted.budget.spentInWindow} publication(s) already ` +
    `spent in the trailing ${budgeted.budget.windowDays}-day window and ${budgeted.budget.alreadyNew} new-but-unaccepted ` +
    `URL(s) pending, so 0 may be published today. Inventory is not exhausted; the throttle is working as declared.`,
  );
}

const frozenHold = selected.length === 0 && heldByFreeze.length > 0;
if (frozenHold) {
  console.log(
    `[content:generate] NAMED STOP ${STOP_CODE}: publication is frozen (data/cadence/policy.json new_page_publication, ` +
    `since ${freeze.frozen_at}) and none of the ${heldByFreeze.length} candidate queries has a measured number in ` +
    `data/search_intelligence/target_query_set.json. Each publishes automatically once its query is measured.`,
  );
}

const answers = [...existingAnswers, ...selected];
fs.writeFileSync(
  "data/content/generated_answers.json",
  JSON.stringify({ schemaVersion: "2.1.0", generatedAt: now, answers }, null, 2) + "\n"
);

ledger.releases ||= [];
ledger.releases.push({
  id: releaseId,
  date: releaseDate,
  status: selected.length ? "published_low_risk_answers" : eligibilityStop ? "no_eligible_answer_routes" : frozenHold ? "publication_frozen_unmeasured_demand" : budgetExhausted ? "no_publication_budget" : "no_distinct_low_risk_inventory",
  eligibilityStop,
  publicationFreeze: { frozen: freeze?.frozen === true, frozenAt: freeze?.frozen_at || null, heldCount: heldByFreeze.length },
  pagesPublished: selected.length,
  dailySafetyCeiling: releaseLimit,
  publicationBudget: { cadenceLimit, governorLimit, requestedLimit, appliedLimit: releaseLimit, capSource: "data/cadence/policy.json new_pages_per_week", ...budgeted.budget },
  riskLimit: "low",
  publishedIds: selected.map((item) => item.id),
  publishedRoutes: selected.map((item) => `/blog/${item.slug}`),
  validationRequired: true,
  cumulativeAnswerCount: answers.length
});
fs.writeFileSync("data/release/release_ledger.json", JSON.stringify(ledger, null, 2) + "\n");

console.log(JSON.stringify({
  status: selected.length ? "PUBLISHED" : eligibilityStop ? `NAMED_STOP_${NO_ELIGIBLE_STOP}` : frozenHold ? "NOOP_PUBLICATION_FROZEN" : budgetExhausted ? "NOOP_PUBLICATION_BUDGET_EXHAUSTED" : "NOOP_NO_DISTINCT_INVENTORY",
  releaseId,
  releaseLimit,
  published: selected.length,
  cumulativeAnswerCount: answers.length,
  pages: selected.map((item) => `/blog/${item.slug}`)
}, null, 2));
