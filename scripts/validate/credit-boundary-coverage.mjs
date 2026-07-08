#!/usr/bin/env node
import fs from "node:fs";
const boundary = JSON.parse(fs.readFileSync("data/legal/self_service_boundary.json", "utf8"));
const footer = fs.readFileSync("src/components/SiteFooter.astro", "utf8");
const pages = fs.readFileSync("src/pages/[...slug].astro", "utf8");
for (const phrase of ["self-service tool", "do not repair credit", "do not contact", "promise any result"]) {
  const haystack = (boundary.footerBoundary + " " + boundary.creditBoundary + " " + footer + " " + pages).toLowerCase();
  if (!haystack.includes(phrase)) throw new Error(`Missing credit boundary phrase: ${phrase}`);
}
console.log("[validate:credit-boundary] OK");
