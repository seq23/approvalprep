#!/usr/bin/env node
import fs from 'node:fs';
const policy = JSON.parse(fs.readFileSync('data/notifications/notification_policy.json','utf8'));
const queue = JSON.parse(fs.readFileSync('data/notifications/notification_queue.json','utf8'));
const log = JSON.parse(fs.readFileSync('data/notifications/notification_log.json','utf8'));
for (const key of ['immediate','digestOnly','neverNotify']) if (!Array.isArray(policy[key]) || policy[key].length === 0) { console.error(`[notification-policy] missing ${key}`); process.exit(1); }
if (!policy.neverNotify.includes('fixture_trace_success') || !policy.immediate.includes('owner_exception')) { console.error('[notification-policy] severity routing invalid'); process.exit(1); }
if (!Array.isArray(queue.items) || !Array.isArray(log.entries)) { console.error('[notification-policy] queue/log malformed'); process.exit(1); }
console.log('[notification-policy] OK');
