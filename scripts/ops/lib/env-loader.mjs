import fs from "node:fs";
import { promptPassphrase } from "./passphrase.mjs";
import { decryptVaultPayload } from "./vault-crypto.mjs";
import { flattenVaultEnv, validateVaultSchema } from "./vault-schema.mjs";

export const VAULT_PATH = ".ops/vault.enc";

export function mask(value) {
  const s = String(value ?? "");
  if (!s) return "missing";
  if (s === "blackgirlmagic") return "blackgirlmagic";
  if (s.length <= 8) return "present";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export async function unlockVaultEnv({ real = true } = {}) {
  if (!fs.existsSync(VAULT_PATH)) throw new Error(`${VAULT_PATH} not found. Run npm run ops:vault:init first.`);
  const passphrase = await promptPassphrase();
  const vault = decryptVaultPayload(fs.readFileSync(VAULT_PATH, "utf8"), passphrase);
  validateVaultSchema(vault, { real });
  const env = flattenVaultEnv(vault);
  for (const [key, value] of Object.entries(env)) process.env[key] = String(value);
  return { vault, env };
}

export function maskedSummary(env) {
  const keys = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET", "POSTDEPLOY_BASE_URL"];
  return Object.fromEntries(keys.map((key) => [key, mask(env[key])]));
}
