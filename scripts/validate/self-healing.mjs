#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
const p=readJson('data/self_healing/self_heal_policy.json'); if (!p.allowed?.length || !p.blocked?.length) throw new Error('self-heal policy incomplete');
console.log('[validate:self-healing] OK');
