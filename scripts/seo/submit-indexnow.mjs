#!/usr/bin/env node
import { spawnSync } from "node:child_process";
const result = spawnSync("node", ["scripts/intelligence/submit-indexnow.mjs"], { stdio: "inherit", env: process.env });
process.exit(result.status || 0);
