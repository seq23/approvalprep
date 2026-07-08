#!/usr/bin/env node
import fs from "node:fs";
import { fail } from "./_common.mjs";
import { validateVaultSchema } from "../ops/lib/vault-schema.mjs";
const file = ".ops/vault.example.json";
if (!fs.existsSync(file)) fail("[vault-schema] missing .ops/vault.example.json");
try {
  const vault = JSON.parse(fs.readFileSync(file, "utf8"));
  validateVaultSchema(vault, { real: false });
} catch (err) {
  fail(`[vault-schema] ${err.message}`);
}
if (fs.existsSync(".ops/vault.enc")) fail("[vault-schema] .ops/vault.enc must not be committed in updater ZIP");
console.log("[vault-schema] OK");
