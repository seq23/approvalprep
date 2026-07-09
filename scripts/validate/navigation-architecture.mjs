#!/usr/bin/env node
import fs from "node:fs";
import { fail } from "./_common.mjs";

const nav = fs.readFileSync("src/data/navigation.ts", "utf8");
const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
for (const token of ["Products", "Letter Studio", "Pricing", "Resources", "Try our Letter Studio - Free!", "secondaryNav"]) {
  if (!nav.includes(token)) fail(`[navigation] missing ${token}`);
}
for (const token of ["primaryNav", "secondaryNav", "navCta", "nav-menu", "nav-menu-panel", "secondary-nav", "Use cases"]) {
  if (!layout.includes(token) && !fs.readFileSync("src/styles/global.css", "utf8").includes(token)) fail(`[navigation] layout/styles missing ${token}`);
}
if (nav.includes("Start Here $0")) fail("[navigation] Start Here $0 must not appear in primary nav");
if (nav.includes('title: "Use Cases"')) fail("[navigation] Use Cases must be a secondary intent rail, not a primary dropdown");
if (nav.includes("See pricing") || nav.includes("Buy a kit")) fail("[navigation] do not duplicate the Pricing nav link with a second pricing CTA");
console.log("[navigation] OK");
