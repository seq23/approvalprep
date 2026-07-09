#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
for (const f of ['data/templates/regulated_template_policy.json','data/templates/template_preview_safety_ledger.json','data/templates/template_claim_map.json','data/templates/template_download_boundary_registry.json']) { if (readJson(f).schemaVersion!=='1.0.0') throw new Error(`${f} invalid`); }
console.log('[validate:regulated-template-previews] OK');
