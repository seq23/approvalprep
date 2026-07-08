#!/usr/bin/env node
import { unlockVaultEnv, maskedSummary } from "./lib/env-loader.mjs";
const { env } = await unlockVaultEnv({ real: false });
console.log("Vault unlock: OK");
console.log(JSON.stringify(maskedSummary(env), null, 2));
