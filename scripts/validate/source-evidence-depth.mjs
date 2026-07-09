#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
for (const f of ['data/citations/source_refresh_queue.json','data/citations/unsupported_claims.json','data/citations/source_quality_registry.json','data/citations/claim_source_depth_report.json','data/citations/source_candidate_queue.json']) { const j=readJson(f); if (j.schemaVersion!=='1.0.0') throw new Error(`${f} invalid`); }
console.log('[validate:source-evidence-depth] OK');
