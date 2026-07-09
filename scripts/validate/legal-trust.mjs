#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";
import fs from "node:fs";
const routes = readJson("data/routes/route_manifest.json").routes.map((r) => r.path);
const required = ["/privacy", "/terms", "/disclaimer", "/refund-policy", "/security", "/accessibility", "/contact", "/editorial-policy", "/ai-use-policy", "/credit-repair-disclaimer", "/not-a-credit-repair-company"];
const missing = required.filter((route) => !routes.includes(route));
if (missing.length) fail("[legal] missing legal routes: " + missing.join(", "));
const page = fs.readFileSync("src/pages/[...slug].astro", "utf8");
const legalComponent = fs.readFileSync("src/components/LegalPolicyPage.astro", "utf8");
for (const token of ["LegalPolicyPage", "!isLegal && <FinalCTA", "Plain-English summary"]) {
  if (!page.includes(token) && !legalComponent.includes(token)) fail(`[legal] missing legal layout token: ${token}`);
}
for (const token of ["not legal advice", "No attorney-client", "not a credit repair company", "does not store letter answers", "info@approvalprep.com"]) {
  if (!legalComponent.toLowerCase().includes(token.toLowerCase())) fail(`[legal] missing professional boundary token: ${token}`);
}
const contact = fs.readFileSync("src/pages/contact.astro", "utf8");
if (!contact.includes("info@approvalprep.com") || contact.includes("TrustAndBoundaryBand") || !contact.includes("showPrivacyNotice={false}")) {
  fail("[legal] contact page must stay minimal with email and no policy spillover");
}
console.log("[legal] OK");
