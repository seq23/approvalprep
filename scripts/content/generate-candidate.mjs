#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

fs.mkdirSync("data/content", { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const ledger = JSON.parse(fs.readFileSync("data/release/release_ledger.json", "utf8"));

function loadRouteCopy() {
  let src = fs.readFileSync("src/data/content.ts", "utf8");
  src = src.replace(/import productsData[^\n]+/, `const productsData = ${fs.readFileSync("data/products/products.json", "utf8")};`);
  src = src.replace(/import offeringData[^\n]+/, `const offeringData = ${fs.readFileSync("data/products/full_offering_catalog.json", "utf8")};`);
  src = src.replace(/import nextStepsData[^\n]+/, `const nextStepsData = ${fs.readFileSync("data/content/customer_next_steps.json", "utf8")};`);
  src = src.replace(/import boundaryData[^\n]+/, `const boundaryData = ${fs.readFileSync("data/legal/self_service_boundary.json", "utf8")};`);
  src = src.replace(/export const /g, "const ");
  src += "\nresult = { routeCopy };";
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext(src, context);
  return context.result.routeCopy;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

const routeCopy = loadRouteCopy();
const candidateRoutes = manifest.routes
  .filter((route) => route.type === "public" && route.index && route.path !== "/")
  .slice(0, 30);

const answers = candidateRoutes.map((route, index) => {
  const copy = routeCopy[route.path];
  const status = route.risk === "regulated" ? "approval_required" : "published_by_contract";
  return {
    id: `daily-${today}-${String(index + 1).padStart(2, "0")}-${slug(route.path)}`,
    title: `What should I know about ${route.title}?`,
    route: route.path,
    riskLevel: route.risk,
    status,
    answer: `${copy.shortAnswer} Before sending anything, gather the proof that supports your statement, check dates and amounts, remove unsupported claims, and keep your own copy trail. ApprovalPrep does not contact third parties, create fake documents, or guarantee a decision.`
  };
});

fs.writeFileSync(
  "data/content/generated_answers.json",
  JSON.stringify({ schemaVersion: "2.0.0", generatedAt: new Date().toISOString(), answers }, null, 2) + "\n"
);

ledger.releases.push({
  id: `candidate-${today}`,
  status: "generated_route_answer_assets",
  publishedLowRisk: answers.filter((answer) => answer.status === "published_by_contract").length,
  approvalRequired: answers.filter((answer) => answer.status === "approval_required").length,
  routesCovered: answers.length,
  validationRequired: true
});
fs.writeFileSync("data/release/release_ledger.json", JSON.stringify(ledger, null, 2) + "\n");
console.log(`[content:generate] generated ${answers.length} route answer assets`);
