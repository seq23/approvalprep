#!/usr/bin/env node
import fs from "node:fs";
const products = JSON.parse(fs.readFileSync("data/products/products.json", "utf8")).products.filter((p) => p.v1 && p.download !== false);
const bad = products.filter((p) => !Array.isArray(p.trust_signals) || p.trust_signals.length < 4);
if (bad.length) throw new Error(`Products missing trust signals: ${bad.map(p=>p.sku).join(", ")}`);
console.log("[validate:trust-signals] OK");
