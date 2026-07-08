#!/usr/bin/env node
import { unlockVaultEnv } from "./lib/env-loader.mjs";
import { run } from "./lib/exec.mjs";
const { env } = await unlockVaultEnv({ real: true });
run("npx", ["wrangler", "d1", "migrations", "apply", env.CLOUDFLARE_D1_DATABASE_NAME, "--remote"]);
