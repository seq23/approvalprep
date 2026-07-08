import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export const APPROVALPREP_PASSPHRASE = "blackgirlmagic";

export async function promptPassphrase(label = "Enter ApprovalPrep passphrase") {
  const rl = readline.createInterface({ input, output });
  try {
    const value = (await rl.question(`${label}: `)).trim();
    if (value !== APPROVALPREP_PASSPHRASE) {
      throw new Error("Invalid ApprovalPrep passphrase.");
    }
    return value;
  } finally {
    rl.close();
  }
}

export function assertRepoOwnedSecretPolicy(vault) {
  const app = vault?.app || {};
  const expected = APPROVALPREP_PASSPHRASE;
  for (const key of ["ADMIN_GATE_PASSWORD", "APP_SESSION_SECRET", "DOWNLOAD_SIGNING_SECRET"]) {
    if (app[key] !== expected) throw new Error(`${key} must equal ${expected}`);
  }
}
