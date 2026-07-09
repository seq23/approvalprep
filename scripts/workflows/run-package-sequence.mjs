#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const sequences = {
  daily: ['content:generate','content:generate-pages','content:generate-atoms-expanded','governance:safe-harbor:all','content:self-heal-citation-os','intelligence:internal-links','content:apply-internal-links','seo:sitemap','citation-handoff:all','metrics:content-velocity','metrics:citation-scoreboard','workflows:trace','validate:all'],
  weekly: ['intelligence:free-ingest','intelligence:analyze','intelligence:cloudflare-crawlers','intelligence:crawler-gap','content:decay-report','content:consolidation-plan','citations:watchlist','citations:audit-sources','citations:source-refresh','governance:safe-harbor:all','handoff:backlinks','metrics:citation-scoreboard','metrics:indexing-scoreboard','metrics:crawler-scoreboard','workflows:trace','validate:all']
};
const name = process.argv[2];
if (!sequences[name]) {
  console.error(`[workflow-sequence] unknown sequence ${name || ''}`);
  process.exit(1);
}
const seenStack = [];
function runScript(scriptName) {
  const command = pkg.scripts?.[scriptName];
  if (!command) throw new Error(`Missing package script: ${scriptName}`);
  if (seenStack.includes(scriptName)) throw new Error(`Recursive script reference: ${[...seenStack, scriptName].join(' -> ')}`);
  seenStack.push(scriptName);
  for (const part of command.split('&&').map(s => s.trim()).filter(Boolean)) {
    const npmMatch = part.match(/^npm\s+run\s+([^\s]+)(?:\s+--silent)?$/);
    if (npmMatch) {
      runScript(npmMatch[1]);
      continue;
    }
    const args = part.split(/\s+/);
    const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', shell: false });
    if (result.status !== 0) process.exit(result.status || 1);
  }
  seenStack.pop();
}
for (const script of sequences[name]) runScript(script);
console.log(`[citation-os:${name}] OK`);
