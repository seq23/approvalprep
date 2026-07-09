#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
for (const f of ['data/content/page_action_history.json','data/content/refresh_execution_ledger.json','data/routes/redirect_execution_ledger.json']) if (readJson(f).schemaVersion!=='1.0.0') throw new Error(`${f} invalid`);
console.log('[validate:page-action-safety] OK');
