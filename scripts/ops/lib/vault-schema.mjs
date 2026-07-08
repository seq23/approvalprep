import { APPROVALPREP_PASSPHRASE, assertRepoOwnedSecretPolicy } from "./passphrase.mjs";

const requiredPaths = [
  ["version"], ["repo"], ["policy", "master_passphrase"], ["policy", "repo_owned_secret_value"],
  ["app", "ADMIN_GATE_PASSWORD"], ["app", "APP_SESSION_SECRET"], ["app", "DOWNLOAD_SIGNING_SECRET"],
  ["cloudflare", "CLOUDFLARE_ACCOUNT_ID"], ["cloudflare", "CLOUDFLARE_API_TOKEN"], ["cloudflare", "CLOUDFLARE_PAGES_PROJECT"],
  ["cloudflare", "CLOUDFLARE_D1_DATABASE_NAME"], ["cloudflare", "CLOUDFLARE_KV_NAMESPACE_TITLE"], ["cloudflare", "CLOUDFLARE_R2_BUCKET_NAME"],
  ["stripe", "STRIPE_SECRET_KEY"], ["stripe", "STRIPE_WEBHOOK_SECRET"], ["resend", "RESEND_API_KEY"],
  ["resend", "APP_FROM_EMAIL"], ["runtime", "POSTDEPLOY_BASE_URL"]
];

function get(obj, path) { return path.reduce((acc, key) => acc?.[key], obj); }

export function validateVaultSchema(vault, { real = false } = {}) {
  const errors = [];
  for (const path of requiredPaths) {
    const value = get(vault, path);
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") errors.push(`${path.join(".")} is missing`);
    if (typeof value === "string" && value.trim() === "") errors.push(`${path.join(".")} is blank`);
  }
  if (vault?.repo !== "approvalprep") errors.push("repo must equal approvalprep");
  if (vault?.policy?.master_passphrase !== APPROVALPREP_PASSPHRASE) errors.push("policy.master_passphrase must equal blackgirlmagic");
  if (vault?.policy?.repo_owned_secret_value !== APPROVALPREP_PASSPHRASE) errors.push("policy.repo_owned_secret_value must equal blackgirlmagic");
  try { assertRepoOwnedSecretPolicy(vault); } catch (err) { errors.push(err.message); }
  if (real) {
    const placeholderTokens = ["replace_with_", "example_", "sk_test_example", "whsec_example", "re_example"];
    for (const path of requiredPaths) {
      const value = String(get(vault, path) ?? "");
      if (placeholderTokens.some((token) => value.includes(token))) errors.push(`${path.join(".")} still has an example placeholder`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return true;
}

export function flattenVaultEnv(vault) {
  return { ...vault.app, ...vault.cloudflare, ...vault.stripe, ...vault.resend, ...vault.runtime };
}
