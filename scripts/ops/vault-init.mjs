#!/usr/bin/env node
import fs from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { promptPassphrase, APPROVALPREP_PASSPHRASE } from "./lib/passphrase.mjs";
import { encryptVaultJson } from "./lib/vault-crypto.mjs";
import { validateVaultSchema } from "./lib/vault-schema.mjs";

const EXAMPLE = ".ops/vault.example.json";
const OUT = ".ops/vault.enc";

function isPlaceholder(value) { return typeof value === "string" && value.startsWith("replace_with_"); }
async function ask(rl, label, current) {
  const answer = (await rl.question(`${label}${current && !isPlaceholder(current) ? ` [keep ${current}]` : ""}: `)).trim();
  return answer || current;
}

await promptPassphrase("Create vault with ApprovalPrep passphrase");
const vault = JSON.parse(fs.readFileSync(EXAMPLE, "utf8"));
vault.policy.master_passphrase = APPROVALPREP_PASSPHRASE;
vault.policy.repo_owned_secret_value = APPROVALPREP_PASSPHRASE;
vault.app.ADMIN_GATE_PASSWORD = APPROVALPREP_PASSPHRASE;
vault.app.APP_SESSION_SECRET = APPROVALPREP_PASSPHRASE;
vault.app.DOWNLOAD_SIGNING_SECRET = APPROVALPREP_PASSPHRASE;

const rl = readline.createInterface({ input, output });
try {
  vault.cloudflare.CLOUDFLARE_ACCOUNT_ID = await ask(rl, "Cloudflare account ID", vault.cloudflare.CLOUDFLARE_ACCOUNT_ID);
  vault.cloudflare.CLOUDFLARE_API_TOKEN = await ask(rl, "Cloudflare API token", vault.cloudflare.CLOUDFLARE_API_TOKEN);
  vault.cloudflare.CLOUDFLARE_PAGES_PROJECT = await ask(rl, "Cloudflare Pages project", vault.cloudflare.CLOUDFLARE_PAGES_PROJECT);
  vault.cloudflare.CLOUDFLARE_D1_DATABASE_NAME = await ask(rl, "D1 database name", vault.cloudflare.CLOUDFLARE_D1_DATABASE_NAME);
  vault.cloudflare.CLOUDFLARE_KV_NAMESPACE_TITLE = await ask(rl, "KV namespace title", vault.cloudflare.CLOUDFLARE_KV_NAMESPACE_TITLE);
  vault.cloudflare.CLOUDFLARE_R2_BUCKET_NAME = await ask(rl, "R2 bucket name", vault.cloudflare.CLOUDFLARE_R2_BUCKET_NAME);
  vault.stripe.STRIPE_SECRET_KEY = await ask(rl, "Stripe secret key", vault.stripe.STRIPE_SECRET_KEY);
  vault.stripe.STRIPE_WEBHOOK_SECRET = await ask(rl, "Stripe webhook secret", vault.stripe.STRIPE_WEBHOOK_SECRET);
  vault.stripe.STRIPE_PRICE_ID_DEFAULT = await ask(rl, "Stripe default price ID", vault.stripe.STRIPE_PRICE_ID_DEFAULT);
  vault.resend.RESEND_API_KEY = await ask(rl, "Resend API key", vault.resend.RESEND_API_KEY);
  vault.resend.APP_FROM_EMAIL = await ask(rl, "App from email", vault.resend.APP_FROM_EMAIL);
  vault.runtime.POSTDEPLOY_BASE_URL = await ask(rl, "Postdeploy base URL", vault.runtime.POSTDEPLOY_BASE_URL);
} finally {
  rl.close();
}

validateVaultSchema(vault, { real: false });
fs.writeFileSync(OUT, encryptVaultJson(vault, APPROVALPREP_PASSPHRASE));
console.log(`Encrypted vault written: ${OUT}`);
console.log("Plaintext vault was not written.");
