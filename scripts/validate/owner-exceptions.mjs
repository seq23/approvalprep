#!/usr/bin/env node
import fs from 'node:fs';
const registry = JSON.parse(fs.readFileSync('data/admin/owner_exception_registry.json','utf8'));
const log = JSON.parse(fs.readFileSync('data/admin/owner_exception_log.json','utf8'));
if (!Array.isArray(registry.items)) { console.error('[owner-exceptions] registry items missing'); process.exit(1); }
if (!Array.isArray(log.entries)) { console.error('[owner-exceptions] log entries missing'); process.exit(1); }
for (const item of registry.items) if (!item.reason) { console.error('[owner-exceptions] exception missing reason'); process.exit(1); }
console.log('[owner-exceptions] OK');
