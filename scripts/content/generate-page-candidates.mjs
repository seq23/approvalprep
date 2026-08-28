#!/usr/bin/env node
import fs from "node:fs";
import { hasDemand, demandRecord, measuredVolume, allRecords } from "../lib/demand_gate.mjs";
import { clampToPublicationBudget } from "../lib/publication_budget.mjs";

const now = new Date().toISOString();
const today = now.slice(0, 10);
const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const writeJson = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const opportunities = readJson("data/content/page_opportunities.json");
const registry = readJson("data/content/page_registry.json");
const routeCopy = readJson("data/content/generated_route_copy.json");
const manifest = readJson("data/routes/route_manifest.json");
const ledger = readJson("data/release/release_ledger.json");

const existingPaths = new Set(manifest.routes.map((route) => route.path));
const registeredPaths = new Set(registry.pages.map((page) => page.path));
const registeredQueries = new Set(registry.pages.map((page) => page.primaryQuery).filter(Boolean));
const velocityDecision = fs.existsSync("data/authority_scale/velocity_decision.json") ? readJson("data/authority_scale/velocity_decision.json") : {};
// A safety cap on a bad run, not a number to reach. The loop below stops when
// it runs out of demand-backed candidates, which is almost always first.
//
// Both of these numbers are this factory's own ceiling and both are 3, while the
// cap that is actually enforced - data/cadence/policy.json new_pages_per_week,
// applied by scripts/cadence_gate.cjs - is 2. So the factory is clamped to the
// remaining headroom under the enforced cap as well as to its own tier. It runs
// after `content:generate` inside citation-os:daily, and the budget is derived
// from the route/answer registries rather than the on-disk sitemap, so what that
// step has already published is counted here rather than spent twice.
const ownCap = Number(velocityDecision.recommended_new_url_ceiling_per_day || opportunities.dailyPublishCap || 3);
const { limit: cap, budget } = clampToPublicationBudget(ownCap, "content:generate-pages");

// The demand gate, applied before anything else looks at an opportunity.
// `page_opportunities.json` is hand-typed, so until now the only thing standing
// between a row in it and a live indexed route was whether someone had typed
// the row. `priority: 98` on the first entry is a number a person chose; it is
// not evidence. Ordering is by measured volume instead, and a candidate with no
// measurement is refused rather than ranked last.
const withoutDemand = [];
const candidates = opportunities.opportunities
  .filter((item) => item && item.path && item.title && item.primaryQuery)
  .filter((item) => !existingPaths.has(item.path) && !registeredPaths.has(item.path) && !registeredQueries.has(item.primaryQuery))
  .filter((item) => {
    if (hasDemand(item.primaryQuery)) return true;
    withoutDemand.push({ path: item.path, primaryQuery: item.primaryQuery, reason: "no_demand_record" });
    return false;
  })
  .sort((a, b) => (measuredVolume(b.primaryQuery) || 0) - (measuredVolume(a.primaryQuery) || 0));

if (withoutDemand.length) {
  console.warn(`[content:generate-pages] refused ${withoutDemand.length} opportunity/opportunities with no demand record:`);
  for (const item of withoutDemand) console.warn(`  - ${item.path} (query: "${item.primaryQuery}")`);
}

const selected = [];
const blocked = [];
for (const item of candidates) {
  if (selected.length >= cap) break;
  const regulated = item.risk === "regulated" || item.family === "credit_self_service" || item.path.includes("credit");
  if (regulated && item.autoPublishEligible !== true) {
    blocked.push({ ...item, status: "approval_required", blockedReason: "regulated_content_requires_owner_approval" });
    registry.pages.push({
      id: item.id,
      path: item.path,
      title: item.title,
      status: "approval_required",
      risk: item.risk,
      family: item.family,
      primaryQuery: item.primaryQuery,
      source: "page_factory",
      generatedAt: now,
      lastValidatedAt: null,
      blockedReason: "regulated_content_requires_owner_approval"
    });
    continue;
  }
  selected.push(item);
}

// Everything this factory writes into `routeCopy` below is one fixed template
// with `item.primaryQuery` and `item.title` interpolated into it: the same
// `lead`, the same five `steps`, the same four `commonMistakes`, the same three
// FAQ answers, on every page it has ever produced. A page like that answers the
// query in the sense that it contains the words, and in no other sense.
//
// So the factory may open a route, but it may not put boilerplate into the
// index. `index` is granted only when the copy differs from the template - which
// today means: only after a person has written something. Until then the route
// is `noindex` and carries `requires_authored_copy`, which is visible backlog
// rather than a URL competing for a 14,800/mo term with filler behind it.
const boilerplateFingerprint = (copy, item) => JSON.stringify(copy)
  .split(item.primaryQuery).join("<QUERY>")
  .split(item.title).join("<TITLE>");
const templateFingerprints = new Set(
  Object.entries(routeCopy.routes || {})
    .filter(([, copy]) => copy && copy.generatedBy === "page_factory")
    .map(([, copy]) => boilerplateFingerprint(copy, { primaryQuery: copy.targetProductSku || "", title: copy.heading || "" }))
);

for (const item of selected) {
  const supporting = [item.primaryQuery, ...(item.secondaryQueries || [])].filter(Boolean);
  const record = demandRecord(item.primaryQuery);
  manifest.routes.push({
    path: item.path,
    title: item.title,
    type: "public",
    family: item.family,
    index: true,
    risk: item.risk,
    nav: false,
    description: `Self-service preparation guide for ${item.primaryQuery}.`,
    indexing: "index",
    page_intent: item.page_intent || "guide",
    conversion_role: "support",
    cta_policy: item.cta_policy || "next_step",
    allowed_cta_count: "multiple",
    primary_cta: "Start free for $0",
    secondary_cta: "Compare paid kits",
    search_role: "rank",
    citation_role: "citation_surface",
    source: "page_factory",
    targetProductSku: item.targetProductSku,
    primaryQuery: item.primaryQuery
  });
  routeCopy.routes[item.path] = {
    heading: item.title,
    lead: `Use this guide to prepare a clear, truthful packet for ${item.primaryQuery} before you send anything yourself.`,
    shortAnswer: `${item.title} helps you organize facts, supporting documents, dates, and next steps without creating fake documents or promising approval.`,
    decisionContext: [
      `Use this page when ${item.primaryQuery} is the exact paperwork pressure you need to handle.`,
      "The goal is not to over-explain. The goal is to make truthful facts easier for a reviewer to understand."
    ],
    whoFor: [
      "People preparing their own application, explanation, or document packet.",
      "People who need a clean structure before sending materials themselves.",
      "People who want self-service guidance without third-party representation."
    ],
    value: [
      "Turns a vague document request into a practical preparation path.",
      "Keeps the self-service boundary clear.",
      "Points users toward the relevant ApprovalPrep kit when they need editable templates."
    ],
    whatYouGet: [
      "A plain-language preparation checklist.",
      "A safe explanation structure.",
      "Review prompts for truth, dates, and supporting proof."
    ],
    prepBrief: [
      "Write down the exact request or issue.",
      "Gather documents that support each factual statement.",
      "Create a short timeline with dates, amounts, names, and context.",
      "Remove unsupported claims before sending anything."
    ],
    commonMistakes: [
      "Sending a long story without proof.",
      "Using language that sounds like a guarantee or threat.",
      "Attaching documents without explaining why they matter.",
      "Forgetting to keep a copy trail."
    ],
    reviewChecklist: [
      "Every claim is truthful and supportable.",
      "Dates, names, amounts, and account details are checked.",
      "Only copies of supporting documents are included unless originals are required.",
      "The final packet is reviewed before the user sends it themselves."
    ],
    steps: [
      "Clarify the document request.",
      "Gather real proof.",
      "Draft the explanation or packet notes in plain language.",
      "Review for truth and completeness.",
      "Send the materials yourself and save copies."
    ],
    useCases: supporting.map((query) => `You are preparing for: ${query}.`),
    faq: [
      { question: `Does this guarantee acceptance for ${item.primaryQuery}?`, answer: "No. ApprovalPrep helps you prepare clearer self-service materials. It does not control reviewer decisions or promise approval." },
      { question: "Will ApprovalPrep send this for me?", answer: "No. ApprovalPrep is self-service. You review, download, and send your own materials." },
      { question: "Can I use this if my situation is complicated?", answer: "You can use it to organize facts, but legal, tax, lending, court, immigration, or regulated issues may require a qualified professional." }
    ],
    trustSignals: ["Self-service only", "No fake document help", "No approval promise", "You send it yourself"],
    citationSummary: `${item.title}: a self-service guide for preparing truthful ${item.primaryQuery} materials with supporting proof and clear boundaries.`,
    targetProductSku: item.targetProductSku,
    generatedBy: "page_factory",
    generatedAt: now
  };

  // Decide indexability from the copy that was just written, not from intent.
  const fingerprint = boilerplateFingerprint(routeCopy.routes[item.path], item);
  const isBoilerplate = templateFingerprints.has(fingerprint);
  templateFingerprints.add(fingerprint);
  const route = manifest.routes[manifest.routes.length - 1];
  if (isBoilerplate) {
    route.index = false;
    route.indexing = "noindex";
    route.requires_authored_copy = true;
    route.noindex_reason = "route copy is the page-factory template with the query interpolated; it is not yet an answer";
  }

  registry.pages.push({
    id: item.id,
    path: item.path,
    title: item.title,
    status: isBoilerplate ? "requires_authored_copy" : "published_by_contract",
    risk: item.risk,
    family: item.family,
    primaryQuery: item.primaryQuery,
    source: "page_factory",
    generatedAt: now,
    lastValidatedAt: null,
    targetProductSku: item.targetProductSku,
    demandEvidence: record
      ? { sourceType: record.source_type, evidenceTier: record.evidence_tier, volume: record.volume, keywordDifficulty: record.keyword_difficulty }
      : null
  });
}

ledger.releases.push({
  id: `page-factory-${today}`,
  status: "generated_pages",
  pagesPublished: selected.length,
  approvalRequired: blocked.length,
  blocked: blocked.length,
  refusedNoDemandRecord: withoutDemand.length,
  publicationBudget: { ownCap, appliedCap: cap, capSource: "data/cadence/policy.json new_pages_per_week", ...budget },
  demandRecordsAvailable: allRecords().length,
  validationRequired: true
});

writeJson("data/routes/route_manifest.json", manifest);
writeJson("data/content/generated_route_copy.json", routeCopy);
writeJson("data/content/page_registry.json", registry);
writeJson("data/release/release_ledger.json", ledger);
fs.mkdirSync("data/workflow_traces", { recursive: true });
writeJson("data/workflow_traces/page_factory_latest.json", { schemaVersion: "1.0.0", generatedAt: now, pagesPublished: selected.map((item) => item.path), approvalRequired: blocked.map((item) => item.path) });
console.log(`[content:generate-pages] published=${selected.length} approvalRequired=${blocked.length}`);
