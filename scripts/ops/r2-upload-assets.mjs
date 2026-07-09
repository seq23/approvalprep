#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { unlockVaultEnv } from "./lib/env-loader.mjs";
import { run } from "./lib/exec.mjs";
const { env } = await unlockVaultEnv({ real: true });
const dir = "seed-downloads";
if (!fs.existsSync(dir)) throw new Error(`${dir} missing`);
for (const file of fs.readdirSync(dir).filter((f) => /\.(pdf|docx)$/i.test(f))) {
  const local = path.join(dir, file);
  run("npx", ["wrangler", "r2", "object", "put", `${env.CLOUDFLARE_R2_BUCKET_NAME}/downloads/${file}`, "--file", local]);
}
console.log("R2 product assets uploaded.");
