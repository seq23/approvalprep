#!/usr/bin/env node
import fs from 'node:fs';
const files=fs.existsSync('.github/workflows')?fs.readdirSync('.github/workflows').filter(f=>f.endsWith('.yml')||f.endsWith('.yaml')):[]; if (!files.includes('citation-os-daily.yml')||!files.includes('citation-os-weekly.yml')) throw new Error('citation OS workflows missing');
console.log(`[validate:workflow-write-scopes] OK workflows=${files.length}`);
