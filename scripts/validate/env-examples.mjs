#!/usr/bin/env node
import fs from "node:fs";
import { fail } from "./_common.mjs";

const files = [".env.example", ".dev.vars.example"];
const requiredEnv = ["APPROVALPREP_MASTER_PASSPHRASE", "ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_PAGES_PROJECT", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "APP_FROM_EMAIL", "POSTDEPLOY_BASE_URL"];
const requiredDev = ["ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY"];

function parseEnv(file) {
  if (!fs.existsSync(file)) fail(`[env-examples] missing ${file}`);
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) fail(`[env-examples] malformed line in ${file}: ${line}`);
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

const env = parseEnv(files[0]);
const dev = parseEnv(files[1]);
for (const key of requiredEnv) if (!env[key]) fail(`[env-examples] ${key} missing from .env.example`);
for (const key of requiredDev) if (!dev[key]) fail(`[env-examples] ${key} missing from .dev.vars.example`);
for (const key of ["APPROVALPREP_MASTER_PASSPHRASE", "ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET"]) {
  if (env[key] !== "blackgirlmagic") fail(`[env-examples] ${key} must equal blackgirlmagic in .env.example`);
}
for (const key of ["ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET"]) {
  if (dev[key] !== "blackgirlmagic") fail(`[env-examples] ${key} must equal blackgirlmagic in .dev.vars.example`);
}
const text = fs.readFileSync(".env.example", "utf8") + "\n" + fs.readFileSync(".dev.vars.example", "utf8");
if (/sk_live_/i.test(text) || /rk_live_/i.test(text) || /whsec_[A-Za-z0-9]{20,}/.test(text) || /re_[A-Za-z0-9]{20,}/.test(text)) {
  fail("[env-examples] real-looking secret found in example env files");
}
console.log("[env-examples] OK");
