#!/usr/bin/env node
import fs from "node:fs";
const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
const css = fs.readFileSync("src/styles/global.css", "utf8");
if (!layout.includes('name="viewport"')) throw new Error("Missing viewport meta");
if (!css.includes("min-height: 44px")) throw new Error("Missing mobile tap target standard");
if (/Status:\s*\{/.test(fs.readFileSync("src/components/ProductGrid.astro", "utf8"))) throw new Error("Customer-facing internal status label remains");
console.log("[validate:browserless-accessibility] OK");
