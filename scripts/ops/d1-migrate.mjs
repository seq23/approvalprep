#!/usr/bin/env node
import { run } from "./lib/exec.mjs";

const databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME || "approvalprep-products";
const migrationFile = process.env.APPROVALPREP_D1_SCHEMA_FILE || "migrations/0001_runtime_product_admin.sql";

run("npx", [
  "wrangler",
  "d1",
  "execute",
  databaseName,
  "--remote",
  `--file=${migrationFile}`
]);

console.log(`D1 schema applied remotely: ${databaseName} using ${migrationFile}`);
