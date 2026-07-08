#!/usr/bin/env node
import fs from "node:fs";
const page = fs.readFileSync("src/pages/[...slug].astro", "utf8");
for (const token of ["Who this is for", "Product / Guide Value", "What you get", "HowItWorks", "FAQBlock", "What this does not do", "NextStepsExplainer", "Why ApprovalPrep"]) {
  if (!page.includes(token)) throw new Error(`Dynamic page missing section: ${token}`);
}
console.log("[validate:public-page-depth] OK");
