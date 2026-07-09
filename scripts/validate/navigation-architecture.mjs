#!/usr/bin/env node
import fs from "node:fs";
import { fail } from "./_common.mjs";

const nav = fs.readFileSync("src/data/navigation.ts", "utf8");
const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
for (const token of ["Products", "Letter Studio", "Use Cases", "Pricing", "Resources", "Start Here $0"]) {
  if (!nav.includes(token)) fail(`[navigation] missing ${token}`);
}
for (const token of ["primaryNav", "navCta", "nav-menu", "nav-menu-panel"]) {
  if (!layout.includes(token) && !fs.readFileSync("src/styles/global.css", "utf8").includes(token)) fail(`[navigation] layout/styles missing ${token}`);
}
console.log("[navigation] OK");
