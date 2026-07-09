#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
if (readJson('data/release/final_citation_os_manifest.json').status!=='phase_a_f_structural_complete') throw new Error('final manifest invalid');
console.log('[validate:final-readiness-ledger] OK');
