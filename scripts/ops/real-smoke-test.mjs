#!/usr/bin/env node
import { unlockVaultEnv } from "./lib/env-loader.mjs";
const { env } = await unlockVaultEnv({ real: true });
const base = env.POSTDEPLOY_BASE_URL.replace(/\/$/, "");
async function check(path, okStatuses = [200]) {
  const res = await fetch(`${base}${path}`);
  if (!okStatuses.includes(res.status)) throw new Error(`${path} returned ${res.status}`);
  console.log(`[smoke] ${path} ${res.status}`);
}
await check("/");
await check("/admin");
await check("/api/products");
await check("/api/download-verify", [400, 401, 405]);
await check("/api/download-file", [400, 401, 403, 405]);
console.log("Real smoke test completed.");
