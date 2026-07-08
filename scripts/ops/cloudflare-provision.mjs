#!/usr/bin/env node
import fs from "node:fs";
import { unlockVaultEnv } from "./lib/env-loader.mjs";
import { run } from "./lib/exec.mjs";

const { env } = await unlockVaultEnv({ real: true });
const statePath = "deployment/setup-state.local.json";
fs.mkdirSync("deployment", { recursive: true });
run("npx", ["wrangler", "d1", "create", env.CLOUDFLARE_D1_DATABASE_NAME]);
run("npx", ["wrangler", "kv", "namespace", "create", env.CLOUDFLARE_KV_NAMESPACE_TITLE]);
run("npx", ["wrangler", "r2", "bucket", "create", env.CLOUDFLARE_R2_BUCKET_NAME]);
fs.writeFileSync(statePath, JSON.stringify({ updated_at: new Date().toISOString(), project: env.CLOUDFLARE_PAGES_PROJECT, d1: env.CLOUDFLARE_D1_DATABASE_NAME, kv: env.CLOUDFLARE_KV_NAMESPACE_TITLE, r2: env.CLOUDFLARE_R2_BUCKET_NAME }, null, 2));
console.log(`Provisioning command set completed. Check ${statePath} and wrangler output for resource IDs to patch into wrangler.toml if Cloudflare created new IDs.`);
