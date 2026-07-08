#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";
const routes = readJson("data/routes/route_manifest.json").routes.map((r) => r.path);
const required = ["/privacy", "/terms", "/disclaimer", "/refund-policy", "/security", "/accessibility", "/contact", "/editorial-policy", "/ai-use-policy", "/credit-repair-disclaimer", "/not-a-credit-repair-company"];
const missing = required.filter((route) => !routes.includes(route));
if (missing.length) fail("[legal] missing legal routes: " + missing.join(", "));
console.log("[legal] OK");
