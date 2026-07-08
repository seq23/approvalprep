#!/usr/bin/env node
import fs from "node:fs";
const css = fs.readFileSync("src/styles/global.css", "utf8");
for (const token of ["@media (max-width: 740px)", ".hero-actions", "grid-template-columns: 1fr", "min-height: 44px", "overflow-x: hidden"]) {
  if (!css.includes(token)) throw new Error(`Mobile CSS missing: ${token}`);
}
console.log("[validate:mobile-ux] OK");
