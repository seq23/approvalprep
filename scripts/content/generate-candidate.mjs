#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { clampToPublicationBudget } from "../lib/publication_budget.mjs";

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

const cadenceLimit = Number(cadence.cadence?.dailyShortAnswers?.targetPerDay || 3);
const governorLimit = Number(governor.current_default_new_page_ceiling_per_day || 3);
const requestedLimit = Number(process.env.CONTENT_RELEASE_LIMIT || Math.min(cadenceLimit, governorLimit));
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
const lowRiskRoutes = manifest.routes
  .filter((route) => route.type === "public" && route.index && route.path !== "/" && route.risk === "low")
  .sort((a, b) => manifest.routes.indexOf(a) - manifest.routes.indexOf(b));

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
    lead: (copy, route) => `The biggest mistakes are unsupported claims, inconsistent dates or amounts, unnecessary personal detail, and sending documents without explaining why they matter. ${copy.shortAnswer || "Use the page as a preparation guide, not as a promise of approval."}`
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

const selected = [];
for (const candidate of candidates) {
  if (selected.length >= releaseLimit) break;
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

const answers = [...existingAnswers, ...selected];
fs.writeFileSync(
  "data/content/generated_answers.json",
  JSON.stringify({ schemaVersion: "2.1.0", generatedAt: now, answers }, null, 2) + "\n"
);

ledger.releases ||= [];
ledger.releases.push({
  id: releaseId,
  date: releaseDate,
  status: selected.length ? "published_low_risk_answers" : "no_distinct_low_risk_inventory",
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
  status: selected.length ? "PUBLISHED" : "NOOP_NO_DISTINCT_INVENTORY",
  releaseId,
  releaseLimit,
  published: selected.length,
  cumulativeAnswerCount: answers.length,
  pages: selected.map((item) => `/blog/${item.slug}`)
}, null, 2));
