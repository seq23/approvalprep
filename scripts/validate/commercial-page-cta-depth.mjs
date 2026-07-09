#!/usr/bin/env node
import fs from "node:fs";
import { fail } from "./_common.mjs";

const dynamic = fs.readFileSync("src/pages/[...slug].astro", "utf8");
const home = fs.readFileSync("src/pages/index.astro", "utf8");
const finalCta = fs.readFileSync("src/components/FinalCTA.astro", "utf8");
for (const token of ["OutcomeCTA", "PageCTAStack", "FinalCTA", "checkout-button", "Start free for $0"]) {
  if (!dynamic.includes(token) && !home.includes(token) && !finalCta.includes(token)) fail(`[commercial-cta-depth] missing ${token}`);
}
for (const token of ["ProblemAgitationFit", "WhatHappensAfterPurchase", "TrustAndBoundaryBand", "IncludedOfferings"]) {
  if (!dynamic.includes(token)) fail(`[commercial-cta-depth] commercial template missing ${token}`);
}
console.log("[commercial-cta-depth] OK");
