#!/usr/bin/env node
// Behaviour guard for POST /api/track-event (functions/api/track-event.js): runs the real handler on an in-memory
// SQLite shaped like D1, with the repo's own migration for conversion_events, and fails if: a real event is not
// recorded, a body over TRACK_LIMITS.maxBody (by header or streamed with none) is read or recorded, one network
// (IPv6 counted by its /64) records more than its minute or day share, the whole site records more than its day
// share, or a limiter that cannot be read lets an event through. Hard-fails on zero events recorded (rule 0).
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost, TRACK_LIMITS } from '../../functions/api/track-event.js';

const fail = (m) => { console.error(`[track-event-limits] FAIL ${m}`); process.exit(1); };
const NOW = Date.parse('2026-11-23T12:00:30Z');
function fakeD1({ failOn } = {}) {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('migrations/0001_runtime_product_admin.sql', 'utf8'));
  const stmt = (sql, args = []) => {
    const guard = () => { if (failOn && failOn.test(sql)) throw new Error('D1_UNAVAILABLE'); };
    return {
      async run() { guard(); const r = raw.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
      async all() { guard(); return { results: raw.prepare(sql).all(...args) }; },
      async first() { guard(); return raw.prepare(sql).get(...args) ?? null; },
    };
  };
  return { raw, prepare: (sql) => ({ ...stmt(sql), bind: (...v) => stmt(sql, v) }) };
}
const rows = (db) => Number(db.raw.prepare('SELECT COUNT(*) AS n FROM conversion_events').get().n);
const EVENT = { event: 'page_view', path: '/kits/credit-letter-kit', sessionIdHash: 'fnv1a_abc' };
const req = (ip, body = JSON.stringify(EVENT), headers = {}) => new Request('https://approvalprep.com/api/track-event', {
  method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...headers }, body, duplex: 'half',
});
const post = (db, ip, now = NOW, body, headers) => onRequestPost({ request: req(ip, body, headers), env: { PRODUCTS_DB: db }, now });
let recorded = 0;

// 1. A real event is recorded, once.
{
  const db = fakeD1();
  const r = await post(db, '198.51.100.7');
  if (r.status !== 200 || (await r.json()).recorded !== true || rows(db) !== 1) fail(`a real event was not recorded (status ${r.status}, rows ${rows(db)})`);
  recorded += rows(db);
}
// 2. Bodies over the cap: refused with 413 whether the header says so or the stream runs over with no header.
{
  const db = fakeD1();
  const big = JSON.stringify({ ...EVENT, source: 'x'.repeat(TRACK_LIMITS.maxBody) });
  const byHeader = await post(db, '198.51.100.8', NOW, big);
  const chunk = new TextEncoder().encode('x'.repeat(1024));
  let sent = 0;
  const stream = new ReadableStream({ pull(c) { if (sent++ < 64) c.enqueue(chunk); else c.close(); } });
  const streamed = await post(db, '198.51.100.8', NOW, stream);
  if (byHeader.status !== 413 || streamed.status !== 413) fail(`an oversized body was accepted (header ${byHeader.status}, streamed ${streamed.status})`);
  if (sent > 8) fail(`the streamed body was read to ${sent} KB before refusing; the cap is ${TRACK_LIMITS.maxBody} bytes`);
  if (rows(db) !== 0) fail('an oversized body was recorded');
  const edge = JSON.stringify({ ...EVENT, source: 'y' }).padEnd(TRACK_LIMITS.maxBody, ' ');
  const atCap = await post(db, '198.51.100.8', NOW, edge);
  if (atCap.status !== 200 || rows(db) !== 1) fail(`a body of exactly ${TRACK_LIMITS.maxBody} bytes was refused (${atCap.status})`);
  recorded += rows(db);
}
// 3. One network: the minute share, then refused; another network still records. IPv6 addresses in one /64 are one
// network, so rotating the low 64 bits buys nothing.
{
  const db = fakeD1();
  for (let i = 0; i < TRACK_LIMITS.perIpMinute; i++) await post(db, `2001:db8:1:2::${(i + 1).toString(16)}`);
  const over = await post(db, '2001:db8:1:2:ffff:ffff:ffff:ffff');
  if (over.status !== 429) fail(`a /64 recorded more than ${TRACK_LIMITS.perIpMinute} events in one minute (${over.status})`);
  if (rows(db) !== TRACK_LIMITS.perIpMinute) fail(`minute share recorded ${rows(db)} rows, want ${TRACK_LIMITS.perIpMinute}`);
  const other = await post(db, '2001:db8:1:3::1');
  if (other.status !== 200) fail(`a different /64 was refused (${other.status}): one network locked out the site's analytics`);
  recorded += rows(db);
}
// 4. One network across a day: spread over minutes, it still stops at the day share.
{
  const db = fakeD1();
  const dayStart = Date.parse('2026-11-23T00:00:30Z');
  for (let i = 0; i < TRACK_LIMITS.perIpDay; i++) await post(db, '203.0.113.9', dayStart + Math.floor(i / TRACK_LIMITS.perIpMinute) * 60_000);
  const over = await post(db, '203.0.113.9', dayStart + 23 * 3_600_000);
  if (over.status !== 429 || rows(db) !== TRACK_LIMITS.perIpDay) fail(`one network recorded ${rows(db)} events in a day (last ${over.status}), cap ${TRACK_LIMITS.perIpDay}`);
  const tomorrow = await post(db, '203.0.113.9', dayStart + 24 * 3_600_000);
  if (tomorrow.status !== 200) fail(`the day share did not reset the next UTC day (${tomorrow.status})`);
  recorded += rows(db);
}
// 5. The whole site: many networks together stop at the day share.
{
  const db = fakeD1();
  for (let i = 0; i < TRACK_LIMITS.allDay; i++) await post(db, `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`);
  const over = await post(db, '192.0.2.200');
  if (over.status !== 429 || rows(db) !== TRACK_LIMITS.allDay) fail(`the site recorded ${rows(db)} events in a day (last ${over.status}), cap ${TRACK_LIMITS.allDay}`);
  recorded += rows(db);
}
// 6. Outage: a limiter that cannot be read writes nothing and says so (503), never a silent insert.
{
  const db = fakeD1({ failOn: /email_rate_limits/ });
  const r = await post(db, '198.51.100.9');
  if (r.status !== 503 || (await r.json()).recorded !== false || rows(db) !== 0) fail(`a down limiter let an event through (status ${r.status}, rows ${rows(db)})`);
}
// 7. The privacy refusal still runs: a body carrying a blocked field is refused and not stored.
{
  const db = fakeD1();
  const r = await post(db, '198.51.100.10', NOW, JSON.stringify({ ...EVENT, email: 'a@b.test' }));
  if (r.status !== 400 || rows(db) !== 0) fail(`a body with an email field was stored (${r.status})`);
}
if (recorded === 0) fail('zero events recorded: the guard examined nothing');
console.log(`[validate:track-event-limits] OK recorded=${recorded} limits=${JSON.stringify(TRACK_LIMITS)}`);
