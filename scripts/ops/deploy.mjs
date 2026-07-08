#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { unlockVaultEnv, maskedSummary } from "./lib/env-loader.mjs";
import { run } from "./lib/exec.mjs";

function pushSecret(project, key, value) {
  console.log(`[ops] wrangler pages secret put ${key} --project-name ${project}`);
  const result = spawnSync("npx", ["wrangler", "pages", "secret", "put", key, "--project-name", project], { input: String(value), stdio: ["pipe", "inherit", "inherit"], shell: false });
  if (result.status !== 0) throw new Error(`Failed to push secret ${key}`);
}

async function smoke(baseUrl) {
  const base = baseUrl.replace(/\/$/, "");
  for (const [route, statuses] of [["/", [200]], ["/admin", [200]], ["/api/products", [200]], ["/api/download-verify", [400,401,405]], ["/api/download-file", [400,401,403,405]]]) {
    const res = await fetch(`${base}${route}`);
    if (!statuses.includes(res.status)) throw new Error(`${route} returned ${res.status}`);
    console.log(`[smoke] ${route} ${res.status}`);
  }
}

console.log("ApprovalPrep real deploy started.");
const { env } = await unlockVaultEnv({ real: true });
console.log("Vault unlock: OK");
console.log(JSON.stringify(maskedSummary(env), null, 2));

fs.mkdirSync("deployment", { recursive: true });
run("npx", ["wrangler", "d1", "create", env.CLOUDFLARE_D1_DATABASE_NAME]);
run("npx", ["wrangler", "kv", "namespace", "create", env.CLOUDFLARE_KV_NAMESPACE_TITLE]);
run("npx", ["wrangler", "r2", "bucket", "create", env.CLOUDFLARE_R2_BUCKET_NAME]);
fs.writeFileSync("deployment/setup-state.local.json", JSON.stringify({ updated_at: new Date().toISOString(), project: env.CLOUDFLARE_PAGES_PROJECT, d1: env.CLOUDFLARE_D1_DATABASE_NAME, kv: env.CLOUDFLARE_KV_NAMESPACE_TITLE, r2: env.CLOUDFLARE_R2_BUCKET_NAME }, null, 2));

for (const key of ["ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "APP_FROM_EMAIL", "POSTDEPLOY_BASE_URL"]) {
  pushSecret(env.CLOUDFLARE_PAGES_PROJECT, key, env[key]);
}

run("npx", ["wrangler", "d1", "migrations", "apply", env.CLOUDFLARE_D1_DATABASE_NAME, "--remote"]);
run("node", ["scripts/runtime/seed-product-registry.mjs"]);
const downloads = "public/downloads";
for (const file of fs.readdirSync(downloads).filter((f) => /\.(pdf|docx)$/i.test(f))) {
  run("npx", ["wrangler", "r2", "object", "put", `${env.CLOUDFLARE_R2_BUCKET_NAME}/${file}`, "--file", path.join(downloads, file)]);
}
await smoke(env.POSTDEPLOY_BASE_URL);
console.log("ApprovalPrep real deploy completed.");
