#!/usr/bin/env node
import fs from 'node:fs';
import { fail } from './_common.mjs';

const requiredFiles = [
  'wrangler.toml',
  'deployment/setup-state.example.json',
  'docs/ops/ONE_TIME_SETUP.md',
  'docs/products/RUNTIME_ADMIN_ARCHITECTURE.md',
  'docs/products/PRODUCT_ADMIN_RUNBOOK.md'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`[setup-and-secrets] missing required setup artifact: ${file}`);
}

const forbiddenRepoFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.vault',
  '_env_contract.json',
  'deployment/env-var-registry.json',
  'deployment/cloudflare-required-secrets.json'
];

for (const file of forbiddenRepoFiles) {
  if (fs.existsSync(file)) fail(`[setup-and-secrets] forbidden secret-bearing/env file present in repo snapshot: ${file}`);
}

const setupText = requiredFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const requiredTerms = [
  'Cloudflare',
  'D1',
  'KV',
  'R2',
  'Stripe',
  'ADMIN_GATE_PASSWORD'
];
for (const term of requiredTerms) {
  if (!setupText.includes(term)) fail(`[setup-and-secrets] setup docs missing required setup term: ${term}`);
}

console.log('[setup-and-secrets] OK — repo-safe setup docs present; live secrets are intentionally not committed');
