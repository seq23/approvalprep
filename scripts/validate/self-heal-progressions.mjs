#!/usr/bin/env node
import fs from 'node:fs';
const playbook = JSON.parse(fs.readFileSync('data/automation/self_heal_playbook.json','utf8'));
const attempts = JSON.parse(fs.readFileSync('data/automation/self_heal_attempts.json','utf8'));
const blocks = JSON.parse(fs.readFileSync('data/automation/final_block_log.json','utf8'));
if (!Array.isArray(playbook.rules) || playbook.rules.length < 3) { console.error('[self-heal-progressions] playbook too thin'); process.exit(1); }
for (const rule of playbook.rules) if (!('issue' in rule) || !('repair' in rule) || !('maxAttempts' in rule)) { console.error('[self-heal-progressions] malformed rule'); process.exit(1); }
if (!Array.isArray(attempts.attempts)) { console.error('[self-heal-progressions] attempts missing'); process.exit(1); }
if (!Array.isArray(blocks.blocks)) { console.error('[self-heal-progressions] final block log missing'); process.exit(1); }
console.log('[self-heal-progressions] OK');
