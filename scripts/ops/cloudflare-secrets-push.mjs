#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { unlockVaultEnv } from "./lib/env-loader.mjs";

const { env } = await unlockVaultEnv({ real: true });
const keys = ["ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "APP_FROM_EMAIL", "POSTDEPLOY_BASE_URL"];
for (const key of keys) {
  console.log(`[ops] wrangler pages secret put ${key} --project-name ${env.CLOUDFLARE_PAGES_PROJECT}`);
  const child = spawnSync("npx", ["wrangler", "pages", "secret", "put", key, "--project-name", env.CLOUDFLARE_PAGES_PROJECT], { input: String(env[key]), stdio: ["pipe", "inherit", "inherit"], shell: false });
  if (child.status !== 0) throw new Error(`Failed to push secret ${key}`);
}
console.log("Cloudflare Pages secrets pushed.");
