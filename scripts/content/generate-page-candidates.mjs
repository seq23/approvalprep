#!/usr/bin/env node
import fs from "node:fs";

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
const cap = Number(opportunities.dailyPublishCap || 3);
const candidates = opportunities.opportunities
  .filter((item) => item && item.path && item.title && item.primaryQuery)
  .filter((item) => !existingPaths.has(item.path) && !registeredPaths.has(item.path) && !registeredQueries.has(item.primaryQuery))
  .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

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

for (const item of selected) {
  const supporting = [item.primaryQuery, ...(item.secondaryQueries || [])].filter(Boolean);
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
  registry.pages.push({
    id: item.id,
    path: item.path,
    title: item.title,
    status: "published_by_contract",
    risk: item.risk,
    family: item.family,
    primaryQuery: item.primaryQuery,
    source: "page_factory",
    generatedAt: now,
    lastValidatedAt: null,
    targetProductSku: item.targetProductSku
  });
}

ledger.releases.push({
  id: `page-factory-${today}`,
  status: "generated_pages",
  pagesPublished: selected.length,
  approvalRequired: blocked.length,
  blocked: blocked.length,
  validationRequired: true
});

writeJson("data/routes/route_manifest.json", manifest);
writeJson("data/content/generated_route_copy.json", routeCopy);
writeJson("data/content/page_registry.json", registry);
writeJson("data/release/release_ledger.json", ledger);
fs.mkdirSync("data/workflow_traces", { recursive: true });
writeJson("data/workflow_traces/page_factory_latest.json", { schemaVersion: "1.0.0", generatedAt: now, pagesPublished: selected.map((item) => item.path), approvalRequired: blocked.map((item) => item.path) });
console.log(`[content:generate-pages] published=${selected.length} approvalRequired=${blocked.length}`);
