#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
const p=readJson('data/experiments/experiment_policy.json'); if (!p.blockedTests?.includes('guaranteed_approval')) throw new Error('experiment policy must block guarantees');
console.log('[validate:experiment-safety] OK');
