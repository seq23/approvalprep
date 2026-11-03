#!/usr/bin/env node
// Behaviour guard (security sweep rows 9 and 11, 3 Nov 2026). Runs the real handlers on an
// in-memory SQLite shaped like D1 and fails if: POST /api/nurture-run runs for a caller without
// the CI bearer secret, or runs at all when the secret is unset; POST /api/admin/login or the
// x-admin-password header lets one IP try more than 10 wrong passwords in 15 minutes, or a
// locked-out IP gets in even with the right password, or one IP's lockout blocks another IP.
// No network: fetch throws, and the nurture env has no Resend key, so nothing can be sent.
// Hard-fails on zero requests examined (rule 0).
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost as nurturePost } from '../../functions/api/nurture-run.js';
import { onRequestPost as loginPost } from '../../functions/api/admin/login.js';
import { requireAdmin } from '../../functions/_runtime/admin.js';
import { ADMIN_LOCKOUT } from '../../functions/_runtime/admin-lockout.js';

globalThis.fetch = async () => { throw new Error('no network in this guard'); };
const fail = (m) => { console.error(`[endpoint-auth] FAIL ${m}`); process.exit(1); };
function fakeD1() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE admin_sessions (id TEXT, session_hash TEXT, created_at TEXT, expires_at TEXT, revoked_at TEXT)');
  const stmt = (sql, args = []) => ({
    async run() { const r = raw.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    async all() { return { results: raw.prepare(sql).all(...args) }; },
    async first() { return raw.prepare(sql).get(...args) ?? null; },
  });
  return { raw, prepare: (sql) => ({ ...stmt(sql), bind: (...v) => stmt(sql, v) }) };
}
let examined = 0;
const expect = (label, got, want) => { examined++; if (got !== want) fail(`${label}: got ${got}, want ${want}`); };

// 1. Nurture trigger: CI bearer secret required; unset secret is a named stop, never an open door.
{
  const SECRET = 'ci-secret-for-guard-0123456789';
  const call = (env, auth) => nurturePost({ env, request: new Request('https://approvalprep.com/api/nurture-run', { method: 'POST', headers: auth ? { authorization: auth } : {} }) });
  const env = { PRODUCTS_DB: fakeD1(), NURTURE_RUN_SECRET: SECRET };
  expect('nurture-run with no Authorization', (await call(env)).status, 401);
  expect('nurture-run with a wrong bearer', (await call(env, 'Bearer nope')).status, 401);
  expect('nurture-run with the secret but no Bearer prefix', (await call(env, SECRET)).status, 401);
  const unset = await call({ PRODUCTS_DB: fakeD1() }, `Bearer ${SECRET}`);
  expect('nurture-run when NURTURE_RUN_SECRET is unset', unset.status, 503);
  if (!String((await unset.json()).stop).includes('NO_NURTURE_RUN_SECRET')) fail('unset secret is not the NAMED STOP NO_NURTURE_RUN_SECRET');
  // The right bearer gets past auth to the sender, which stops on the missing Resend key (nothing sent).
  const ok = await call(env, `Bearer ${SECRET}`);
  const body = await ok.json();
  if (ok.status === 401 || body.error === 'UNAUTHORIZED') fail('the right bearer was refused');
  examined++;
}

// 2. Admin login and the x-admin-password header: per-IP lockout after 10 wrong passwords.
const PASSWORD = 'guard-password-not-real';
const loginReq = (password, ip) => new Request('https://approvalprep.com/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ password }) });
{
  const env = { PRODUCTS_DB: fakeD1(), ADMIN_GATE_PASSWORD: PASSWORD, ADMIN_SESSION_SECRET: 's' };
  for (let i = 0; i < ADMIN_LOCKOUT.maxFailures; i++) expect(`login wrong password #${i + 1}`, (await loginPost({ request: loginReq(`guess${i}`, '203.0.113.5'), env })).status, 401);
  expect('login from a locked-out IP with the right password', (await loginPost({ request: loginReq(PASSWORD, '203.0.113.5'), env })).status, 429);
  expect('login from another IP with the right password', (await loginPost({ request: loginReq(PASSWORD, '198.51.100.9'), env })).status, 200);
  if (JSON.stringify(env.PRODUCTS_DB.raw.prepare('SELECT * FROM email_rate_limits').all()).includes('203.0.113.5')) fail('the raw IP was stored');
}
{
  const env = { PRODUCTS_DB: fakeD1(), ADMIN_GATE_PASSWORD: PASSWORD, ADMIN_SESSION_SECRET: 's' };
  const hdr = (password, ip) => new Request('https://approvalprep.com/api/admin/products', { headers: { 'x-admin-password': password, 'cf-connecting-ip': ip } });
  for (let i = 0; i < ADMIN_LOCKOUT.maxFailures; i++) {
    const r = await requireAdmin(hdr(`guess${i}`, '203.0.113.6'), env);
    expect(`x-admin-password wrong #${i + 1}`, r.ok ? 200 : r.response.status, 401);
  }
  const locked = await requireAdmin(hdr(PASSWORD, '203.0.113.6'), env);
  expect('x-admin-password from a locked-out IP with the right password', locked.ok ? 200 : locked.response.status, 429);
  const other = await requireAdmin(hdr(PASSWORD, '198.51.100.10'), env);
  expect('x-admin-password from another IP with the right password', other.ok ? 200 : other.response.status, 200);
}

if (examined < 20) fail(`only ${examined} requests examined`);
console.log(`[endpoint-auth] PASS ${examined} requests: nurture-run needs the CI bearer; admin login and x-admin-password lock an IP out after ${ADMIN_LOCKOUT.maxFailures} wrong passwords`);
