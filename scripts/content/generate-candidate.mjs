#!/usr/bin/env node
import fs from "node:fs";
const ledger = JSON.parse(fs.readFileSync("data/release/release_ledger.json", "utf8"));
ledger.releases.push({ id: "candidate-" + new Date().toISOString().slice(0, 10), status: "generated_candidate", validationRequired: true });
fs.writeFileSync("data/release/release_ledger.json", JSON.stringify(ledger, null, 2) + "\n");
console.log("[content:generate] candidate recorded");
