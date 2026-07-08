#!/usr/bin/env node
import fs from 'node:fs';
const required = ['.env.example','_env_contract.json','deployment/env-var-registry.json','deployment/cloudflare-required-secrets.json','wrangler.toml','.env.vault.example'];
const missing = required.filter(f=>!fs.existsSync(f));
const cli = (name)=>({name, status:'NOT_CHECKED_IN_SANDBOX', note:'Run locally to verify CLI availability.'});
const report = {schemaVersion:'4.2.0', status: missing.length?'MISSING_REQUIRED_FILES':'OK', missing, cli:[cli('wrangler'), cli('gh')], proofBoundary:'Does not verify live Cloudflare/GitHub auth in sandbox.'};
fs.mkdirSync('reports',{recursive:true}); fs.writeFileSync('reports/setup-doctor.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(missing.length) process.exit(1);
