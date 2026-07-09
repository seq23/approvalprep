#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";
import { fail, readJson } from "./_common.mjs";

function loadContent() {
  let src = fs.readFileSync("src/data/content.ts", "utf8");
  src = src.replace(/import productsData[^\n]+/, `const productsData = ${fs.readFileSync("data/products/products.json", "utf8")};`);
  src = src.replace(/import offeringData[^\n]+/, `const offeringData = ${fs.readFileSync("data/products/full_offering_catalog.json", "utf8")};`);
  src = src.replace(/import nextStepsData[^\n]+/, `const nextStepsData = ${fs.readFileSync("data/content/customer_next_steps.json", "utf8")};`);
  src = src.replace(/import boundaryData[^\n]+/, `const boundaryData = ${fs.readFileSync("data/legal/self_service_boundary.json", "utf8")};`);
  src = src.replace(/import generatedRouteCopyData[^\n]+/, `const generatedRouteCopyData = ${fs.readFileSync("data/content/generated_route_copy.json", "utf8")};`);
  src = src.replace(/export const /g, "const ");
  src += "\nresult = { routeCopy, homepageChooser, productComparison, footerGroups, trustSignals };";
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext(src, context);
  return context.result;
}

const manifest = readJson("data/routes/route_manifest.json");
const content = loadContent();
const routeSet = new Set(manifest.routes.map((route) => route.path));
const allowedFiles = new Set(["/llms.txt", "/llms-full.txt", "/sitemap.xml"]);
const failures = [];

function assertInternalPath(path, source) {
  if (!path || path.startsWith("#") || path.startsWith("http")) return;
  const normalized = path.split("#")[0];
  if (!normalized || routeSet.has(normalized) || allowedFiles.has(normalized)) return;
  failures.push(`${source} links to missing route ${path}`);
}

for (const item of content.homepageChooser) assertInternalPath(item.href, "homepageChooser");
for (const row of content.productComparison) assertInternalPath(row.href, "productComparison");
for (const group of content.footerGroups) for (const [href] of group.links) assertInternalPath(href, `footer:${group.title}`);

for (const required of ["/", "/pricing", "/letter-of-explanation", "/credit-letter-kit", "/rental-application-kit", "/checkout/success", "/download", "/privacy", "/terms", "/disclaimer"]) {
  if (!routeSet.has(required)) failures.push(`required journey route missing ${required}`);
}

for (const route of manifest.routes.filter((item) => item.type !== "admin" && item.path !== "/" && item.index)) {
  const copy = content.routeCopy[route.path];
  if (!copy) failures.push(`route missing copy ${route.path}`);
  if (copy && (!copy.primaryCta || !copy.secondaryCta)) failures.push(`route missing CTA ${route.path}`);
  if (copy && !/ApprovalPrep does not|does not|No\./i.test(JSON.stringify(copy))) failures.push(`route missing boundary language ${route.path}`);
}

const indexPage = fs.readFileSync("src/pages/index.astro", "utf8");
const dynamicPage = fs.readFileSync("src/pages/[...slug].astro", "utf8");
const studioPage = fs.readFileSync("src/pages/letter-writing-studio.astro", "utf8");
const studioComponent = fs.readFileSync("src/components/LetterStudio.astro", "utf8");
const footer = fs.readFileSync("src/components/SiteFooter.astro", "utf8");
for (const token of ["Start free for $0", "Choose by pressure point", "Compare all kits and prices", "FreeStudioCTA", "OfferingUniverse", "FinalCTA"]) {
  if (!indexPage.includes(token)) failures.push(`homepage missing journey token ${token}`);
}
for (const token of ["Decision context", "What to prepare first", "Review before you send", "IncludedOfferings", "FinalCTA"]) {
  if (!dynamicPage.includes(token)) failures.push(`dynamic page missing journey token ${token}`);
}
for (const token of ["Start for $0", "does not store", "LetterStudio", "paid kits"]) {
  if (!studioPage.includes(token) && !studioComponent.includes(token)) failures.push(`studio page missing journey token ${token}`);
}
for (const token of ["Products", "Popular Guides", "Legal", "Resources"]) {
  if (!footer.includes(token) && !JSON.stringify(content.footerGroups).includes(token)) failures.push(`footer missing ${token}`);
}

if (failures.length) fail(`[e2e-user-journey] ${failures.join("; ")}`);
console.log(`[e2e-user-journey] OK routes=${manifest.routes.length} homepageChoices=${content.homepageChooser.length} footerGroups=${content.footerGroups.length}`);
