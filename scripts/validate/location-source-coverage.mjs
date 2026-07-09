#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
const pages=readJson('data/locations/location_page_registry.json',{pages:[]}).pages||[]; for (const p of pages) if (p.status==='published' && p.requiresSourceCoverage && !p.sourceCoverageVerified) throw new Error(`location page lacks source coverage ${p.path}`);
console.log('[validate:location-source-coverage] OK');
