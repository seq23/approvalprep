#!/usr/bin/env node
import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const publicRoutes = manifest.routes.filter((route) => route.index && route.type === "public");
const routePaths = new Set(publicRoutes.map((route) => route.path));
const inferSku = (path) => {
  if (/business|sba/.test(path)) return "business-funding-prep-kit";
  if (/apartment|rental/.test(path)) return "rental-application-kit";
  if (/credit/.test(path)) return "credit-letter-kit";
  if (/employment|income/.test(path)) return "income-employment-letter-kit";
  if (/auto-loan|car-loan|mortgage|loan/.test(path)) return "loan-prep-letter-kit";
  if (/moving|important-documents/.test(path)) return "life-admin-letter-kit";
  if (/complete/.test(path)) return "complete-approvalprep-bundle";
  return "letter-of-explanation";
};
const records = [];
const anchors = [];
for (const route of publicRoutes) {
  if (["/", "/download", "/checkout/success"].includes(route.path)) continue;
  const sku = route.targetProductSku || inferSku(route.path);
  const familyLinks = publicRoutes.filter((candidate) => candidate.path !== route.path && candidate.family === route.family).slice(0, 3);
  const product = publicRoutes.find((candidate) => candidate.path !== route.path && (candidate.page_intent === "product" || candidate.cta_policy === "purchase") && inferSku(candidate.path) === sku);
  const links = [];
  for (const item of familyLinks) links.push({ href: item.path, title: item.title, reason: "same_family", anchorText: item.title });
  if (product) links.push({ href: product.path, title: product.title, reason: "relevant_product", anchorText: `Compare the ${product.title}` });
  if (route.path !== "/letter-writing-studio") links.push({ href: "/letter-writing-studio", title: "Free Letter Writing Studio", reason: "free_start", anchorText: "Start free for $0" });
  if (route.path !== "/pricing") links.push({ href: "/pricing", title: "ApprovalPrep Pricing", reason: "compare_kits", anchorText: "Compare paid kits" });
  if (route.path !== "/resources") links.push({ href: "/resources", title: "ApprovalPrep Resources", reason: "resource_hub", anchorText: "Browse related resources" });
  const seen = new Set();
  const clean = links.filter((link) => {
    const allowed = routePaths.has(link.href) || ["/letter-writing-studio", "/pricing", "/resources"].includes(link.href);
    if (!allowed || seen.has(link.href) || link.href === route.path) return false;
    seen.add(link.href);
    return true;
  }).slice(0, 5);
  records.push({ path: route.path, title: route.title, family: route.family, targetProductSku: sku, links: clean });
  for (const link of clean) anchors.push({ source: route.path, target: link.href, anchorText: link.anchorText, reason: link.reason });
}
const generatedAt = new Date().toISOString();
fs.mkdirSync("data/atlas", { recursive: true });
fs.mkdirSync("data/intelligence", { recursive: true });
fs.writeFileSync("data/atlas/internal_link_graph.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt, records }, null, 2) + "\n");
fs.writeFileSync("data/atlas/anchor_text_registry.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt, anchors }, null, 2) + "\n");
fs.writeFileSync("data/intelligence/internal_link_opportunities.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt, opportunities: records.filter((record) => record.links.length < 3) }, null, 2) + "\n");
console.log(`[internal-links] OK records=${records.length} anchors=${anchors.length}`);
