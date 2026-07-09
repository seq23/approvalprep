#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const page = fs.readFileSync("src/pages/[...slug].astro", "utf8");
for (const token of ["Decision context", "What to prepare first", "Common mistakes this helps prevent", "Review before you send", "FAQBlock", "What this does not do", "NextStepsExplainer", "GuidePlaybook", "LegalPolicyPage"]) {
  if (!page.includes(token)) throw new Error(`Dynamic page missing depth section: ${token}`);
}
const guide = fs.readFileSync("src/components/GuidePlaybook.astro", "utf8");
for (const token of ["Use this when", "Gather first", "Review before sending", "Avoid", "Start free for $0"]) {
  if (!guide.includes(token)) throw new Error(`[public-page-depth] guide playbook missing token: ${token}`);
}
const methodology = fs.readFileSync("src/pages/methodology.astro", "utf8");
for (const token of ["How ApprovalPrep works", "What it is not", "No legal advice", "No credit repair service", "No approval guarantee"]) {
  if (!methodology.includes(token)) throw new Error(`[public-page-depth] methodology page missing safe token: ${token}`);
}

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

function words(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function pageWords(copy) {
  let total = words(copy.heading) + words(copy.lead) + words(copy.shortAnswer);
  for (const key of ["decisionContext", "whoFor", "value", "whatYouGet", "useCases", "prepBrief", "commonMistakes", "reviewChecklist", "steps", "trustSignals"]) {
    for (const item of copy[key] || []) total += words(item);
  }
  for (const item of copy.faq || []) total += words(item.question) + words(item.answer);
  return total;
}

const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const routeCopy = loadRouteCopy();
const genericLead = "Use this page to understand what to prepare";
const failures = [];
const measured = [];

for (const route of manifest.routes.filter((item) => item.type !== "admin" && item.path !== "/" && item.index)) {
  const copy = routeCopy[route.path];
  if (!copy) {
    failures.push(`${route.path}: missing routeCopy`);
    continue;
  }
  const total = pageWords(copy);
  measured.push(total);
  if (copy.lead.includes(genericLead)) failures.push(`${route.path}: generic lead remains`);
  if (total < 480) failures.push(`${route.path}: thin measured copy (${total} words)`);
  for (const key of ["decisionContext", "prepBrief", "commonMistakes", "reviewChecklist"]) {
    if (!copy[key]?.length) failures.push(`${route.path}: missing ${key}`);
  }
}

const uniqueLeads = new Set(Object.values(routeCopy).map((copy) => copy.lead)).size;
if (uniqueLeads < Object.keys(routeCopy).length * 0.9) failures.push("route leads are not sufficiently unique");
if (failures.length) throw new Error(`[public-page-depth] ${failures.join("; ")}`);

const avg = Math.round(measured.reduce((sum, value) => sum + value, 0) / measured.length);
const min = Math.min(...measured);
console.log(`[validate:public-page-depth] OK avgWords=${avg} minWords=${min}`);
