#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
const p=readJson('data/validation/severity_policy.json'); if (!p.hardFailCategories?.includes('public_paid_asset_leakage')) throw new Error('severity policy missing business blocker categories');
console.log('[validate:validator-severity] OK');
