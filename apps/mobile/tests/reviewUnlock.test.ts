// Google Play review code (functions/_runtime/review.js, the three doors, src/purchases/review.ts): how it breaks,
// each case proven. The server runs against a real SQLite database built from the repo's migrations (a D1 stand-in)
// and a fake RevenueCat v2 that keeps real purchases apart from granted entitlements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
// @ts-ignore Pages runtime is JavaScript
import { BUNDLE_ENTITLEMENT, LIMITS, reviewStatus, reviewUnlock } from '../../../functions/_runtime/review.js';
// @ts-ignore Pages runtime is JavaScript
import { onRequestGet as statusRoute } from '../../../functions/api/review/index.js';
// @ts-ignore Pages runtime is JavaScript
import { ipPrefix } from '../../../functions/_runtime/rate-limit.js';
// @ts-ignore Pages runtime is JavaScript
import { onRequestPost as bundleDoor } from '../../../functions/api/app-bundle.js';
// @ts-ignore Pages runtime is JavaScript
import { onRequestPost as filesDoor } from '../../../functions/api/app-files.js';
// @ts-ignore Pages runtime is JavaScript
import { onRequestPost as kitDoor } from '../../../functions/api/app-unlock.js';
import { products, purchases } from './revenuecatV2';
import { COMPLETE_BUNDLE, KIT } from '../src/kit';
import { ownershipFrom } from '../src/purchases/bundleOffers';
import { REVIEW_LINK, REVIEW_URL, REVIEW_USE, applyReviewCode, redeemReviewCode, reviewWindowOpen } from '../src/purchases/review';

const CODE = '4815162342', NOW = Date.now(), DAY = 86_400_000;
const anon = (n: number) => `$RCAnonymousID:${n.toString(16).padStart(32, '0')}`;
const MIGRATIONS = '../../migrations';

/** D1's prepare/bind/first/run/all over node:sqlite, with the repo's own migrations applied. `fail` takes D1 down;
 * `failOn` takes down only the statements that match (e.g. the review tables), so the rest keeps working. */
function d1() {
  const db = new DatabaseSync(':memory:');
  for (const f of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync(`${MIGRATIONS}/${f}`, 'utf8'));
  let down: RegExp | null = null;
  const api = {
    raw: db, fail(on: boolean) { down = on ? /./ : null; }, failOn(pattern: RegExp | null) { down = pattern; },
    prepare(sql: string) {
      let args: unknown[] = [];
      const guard = () => { if (down?.test(sql)) throw Error('D1_DOWN'); };
      const stmt = { bind(...a: unknown[]) { args = a; return stmt; },
        async first() { guard(); return db.prepare(sql).get(...(args as never[])) ?? null; },
        async run() { guard(); db.prepare(sql).run(...(args as never[])); return { success: true }; },
        async all() { guard(); return { results: db.prepare(sql).all(...(args as never[])) }; } };
      return stmt;
    },
  };
  return api;
}
type D1 = ReturnType<typeof d1>;

/** A fake RevenueCat v2: known customers, their real store purchases, granted entitlements; can fail on demand. */
function revenuecat() {
  const known = new Set<string>(), granted = new Map<string, number>(), bought = new Map<string, unknown[]>(), sandboxEntitled = new Set<string>();
  const calls: string[] = [];
  let mode: 'ok' | '5xx' | 'timeout' | '403' = 'ok', active: 'ok' | '5xx' = 'ok', bills: 'ok' | '5xx' = 'ok', openLoops = 0;
  const openLoopStops: string[] = [];
  // Boss OS's intake: up (201), down (fetch throws), refusing (500), or hanging until the test releases it.
  let intake: 'up' | 'throws' | '500' | 'hangs' = 'up';
  const held: (() => void)[] = [];
  const fetcher = (async (input: unknown, init: RequestInit = {}) => {
    const url = String(input);
    if (url.includes('open-loops/intake')) {
      openLoops++; openLoopStops.push(JSON.parse(String(init?.body)).stop);
      if (intake === 'throws') throw new TypeError('fetch failed');
      if (intake === '500') return new Response('{}', { status: 500 });
      if (intake === 'hangs') return new Promise<Response>((_, fail) => held.push(() => fail(new DOMException('timed out', 'TimeoutError'))));
      return new Response('{}', { status: 201 });
    }
    if (url.includes('/products?')) return Response.json(products);
    calls.push(`${init.method ?? 'GET'} ${url.replace(/^.*\/customers\//, '')}`);
    const id = decodeURIComponent(url.split('/customers/')[1]!.split(/[/?]/)[0]!);
    if (url.includes('/purchases?')) return bills === '5xx' ? new Response('{}', { status: 503 }) : Response.json({ object: 'list', items: bought.get(id) ?? [], next_page: null });
    if (url.includes('/active_entitlements')) {
      if (active === '5xx') return new Response('{}', { status: 503 });
      const items = [...(granted.has(id) && granted.get(id)! > Date.now() ? [{ object: 'customer.active_entitlement', entitlement_id: BUNDLE_ENTITLEMENT, expires_at: granted.get(id) }] : []),
        ...(sandboxEntitled.has(id) ? [{ object: 'customer.active_entitlement', entitlement_id: BUNDLE_ENTITLEMENT, expires_at: null }] : [])];
      return Response.json({ object: 'list', items, next_page: null });
    }
    if (url.endsWith('/actions/revoke_granted_entitlement')) { granted.delete(id); return new Response('{}', { status: 200 }); }
    if (mode === 'timeout' && url.endsWith('/grant_entitlement')) { granted.set(id, NOW + DAY); throw Error('TimeoutError'); }
    if (mode === '5xx' && url.endsWith('/grant_entitlement')) return new Response('{}', { status: 502 });
    if (mode === '403' && url.endsWith('/grant_entitlement')) return new Response('{}', { status: 403 });
    if (!url.includes('/actions/')) return new Response('{}', { status: known.has(id) ? 200 : 404 });
    const body = JSON.parse(String(init.body));
    assert.equal(body.entitlement_id, BUNDLE_ENTITLEMENT);
    granted.set(id, body.expires_at);
    return new Response('{}', { status: 201 });
  }) as unknown as typeof fetch;
  return { known, granted, bought, sandboxEntitled, calls, fetcher, set(m: typeof mode) { mode = m; }, setIntake(m: typeof intake) { intake = m; }, release() { held.splice(0).forEach(f => f()); }, activeDown(on: boolean) { active = on ? '5xx' : 'ok'; }, purchasesDown(on: boolean) { bills = on ? '5xx' : 'ok'; }, get openLoops() { return openLoops; }, openLoopStops };
}
type RC = ReturnType<typeof revenuecat>;

const assets = { get: async (key: string) => key.endsWith('.zip') ? { body: 'FAKE-ZIP' } : { json: async () => ({ kit: key }) }, head: async () => ({ size: 123 }) };
function env(db: D1 = d1(), over: Record<string, unknown> = {}) {
  return { REVIEW_CODE_SECRET: CODE, REVIEW_CODE_VERSION: 'v1', REVIEW_UNTIL: new Date(NOW + 20 * DAY).toISOString(), REVIEW_HASH_SECRET: 's'.repeat(40), REVIEW_MAX_DEVICES: '10',
    APPROVALPREP_REVENUECAT_SECRET: 'sk_fictional', BOSS_OPEN_LOOPS_TOKEN: 't', PRODUCTS_DB: db, DOWNLOAD_SIGNING_SECRET: 'fake-signing', PRODUCT_ASSETS_R2: assets, ...over };
}
type Env = ReturnType<typeof env>;
const req = (body: unknown, ip = '203.0.113.7', type = 'application/json') =>
  new Request('https://approvalprep.com/api/review/unlock', { method: 'POST', headers: { 'content-type': type, 'cf-connecting-ip': ip }, body: body instanceof ReadableStream ? body : typeof body === 'string' ? body : JSON.stringify(body), duplex: 'half' } as RequestInit);
/** Calls like Pages: work handed to waitUntil is collected and, unless `settle` is false, finished before returning. */
async function call(e: Env, rc: RC, body: unknown, ip?: string, now = NOW, settle = true) {
  const waits: Promise<unknown>[] = [];
  const res = await reviewUnlock(req(body, ip), e, { now, fetcher: rc.fetcher, waitUntil: (p: Promise<unknown>) => waits.push(p) });
  if (settle) await Promise.all(waits);
  return { status: res.status, body: await res.json() as { error?: string; unlocked?: boolean }, headers: res.headers, waits };
}
const triesTaken = (e: Env, bucket = 'all') => Number((e.PRODUCTS_DB as D1).raw.prepare("SELECT COALESCE(SUM(tries),0) AS n FROM review_try WHERE bucket LIKE ?").get(`${bucket}:%`)!.n);
const slots = (e: Env) => Number((e.PRODUCTS_DB as D1).raw.prepare('SELECT COUNT(*) AS n FROM review_grant').get()!.n);

/** The three doors for one ID, as the app calls them: [status, body text] each. */
// Each door call comes from its own IP, so the doors' own per-IP limits (tested in bundle.test.ts) stay out of the way.
let doorIp = 0;
async function doors(e: Record<string, unknown>, id: string) {
  const ip = `10.0.${Math.floor(++doorIp / 250)}.${doorIp % 250}`;
  const post = (path: string) => new Request(`https://approvalprep.com${path}`, { method: 'POST', headers: { authorization: `Bearer ${id}`, 'cf-connecting-ip': ip } });
  const out: Record<string, [number, string]> = {};
  for (const [name, door, path] of [['bundle', bundleDoor, '/api/app-bundle'], ['files', filesDoor, '/api/app-files?kit=rental-application-kit'],
    ['credit', kitDoor, '/api/app-unlock?kit=credit-letter-kit'], ['explanation', kitDoor, '/api/app-unlock?kit=letter-of-explanation-kit']] as const) {
    const res = await door({ request: post(path), env: e });
    out[name] = [res.status, res.status === 200 ? '' : await res.text()];
  }
  return out;
}
const refusedEverywhere = (d: Record<string, [number, string]>, noPurchase: Record<string, [number, string]>) => {
  for (const k of Object.keys(d)) { assert.equal(d[k]![0], 403, k); assert.equal(d[k]![1], noPurchase[k]![1], `${k}: same body as no purchase`); }
};

test('closed window (past, missing, malformed, no secret, no D1): status and unlock answer 404 and call no one', async () => {
  const rc = revenuecat(); rc.known.add(anon(1));
  for (const over of [{ REVIEW_UNTIL: '2026-01-01' }, { REVIEW_UNTIL: undefined }, { REVIEW_UNTIL: 'soon' }, { REVIEW_CODE_SECRET: undefined }, { REVIEW_CODE_SECRET: '123456' },
    { REVIEW_CODE_VERSION: undefined }, { APPROVALPREP_REVENUECAT_SECRET: undefined }, { REVIEW_HASH_SECRET: 'short' }, { PRODUCTS_DB: undefined }]) {
    const e = env(d1(), over);
    assert.equal((await reviewStatus(e, NOW)).status, 404, JSON.stringify(over));
    assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) })).status, 404);
  }
  assert.deepEqual(rc.calls, []);
  const open = await reviewStatus(env(), NOW);
  assert.equal(open.status, 200); assert.equal(open.headers.get('cache-control'), 'no-store');
  assert.ok(!JSON.stringify(await open.json()).includes(CODE));
});

test('the right code grants 7 days of the bundle to a known ID, never past the window; the code never appears in a response', async () => {
  const e = env(), rc = revenuecat(); rc.known.add(anon(1));
  const r = await call(e, rc, { code: CODE, app_user_id: anon(1) });
  assert.deepEqual(r.body, { unlocked: true });
  assert.equal(rc.granted.get(anon(1)), NOW + 7 * DAY);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const until = new Date(NOW + 2 * DAY).toISOString();
  const e2 = env(d1(), { REVIEW_UNTIL: until }), rc2 = revenuecat(); rc2.known.add(anon(2));
  await call(e2, rc2, { code: CODE, app_user_id: anon(2) });
  assert.equal(rc2.granted.get(anon(2)), Date.parse(until));
  for (const body of [{ code: '0000000000', app_user_id: anon(1) }, { code: CODE, app_user_id: anon(1) }])
    assert.ok(!JSON.stringify((await call(e, rc, body, '198.51.100.1')).body).includes(CODE));
});

test('guessing: wrong code 403 and counted; per network 5 a minute and 20 a day, and the global cap, all refuse BEFORE the compare', async () => {
  const e = env(), rc = revenuecat(); rc.known.add(anon(1));
  assert.equal((await call(e, rc, { code: '0000000000', app_user_id: anon(1) })).body.error, 'WRONG_CODE');
  assert.equal(triesTaken(e), 1);
  // Burst: the 6th try in a minute from one network (each from a different install), even with the RIGHT code, never
  // reaches the compare or RevenueCat.
  const b = env(), rcb = revenuecat(); rcb.known.add(anon(1));
  for (let i = 0; i < LIMITS.perIpBurst; i++) assert.equal((await call(b, rcb, { code: '0000000000', app_user_id: anon(100 + i) })).status, 403);
  const burst = await call(b, rcb, { code: CODE, app_user_id: anon(1) });
  assert.equal(burst.status, 429); assert.equal(rcb.granted.size, 0); assert.deepEqual(rcb.calls, []);
  // Per IP per day: 20 tries over minutes (from many installs); the 21st (right code) is 429, never compared or granted.
  const d = env(), rcd = revenuecat(); rcd.known.add(anon(1));
  const start = Date.parse(new Date(NOW).toISOString().slice(0, 10) + 'T00:00:00Z');
  for (let i = 0; i < LIMITS.perIpDaily; i++) assert.equal((await call(d, rcd, { code: '0000000000', app_user_id: anon(200 + i) }, undefined, start + i * 61_000)).status, 403);
  const late = await call(d, rcd, { code: CODE, app_user_id: anon(1) }, undefined, start + 30 * 61_000);
  assert.equal(late.status, 429); assert.equal(rcd.granted.size, 0); assert.deepEqual(rcd.calls, []);
  // Another IP is not blocked by that one; the global daily cap stops everyone.
  assert.equal((await call(d, rcd, { code: CODE, app_user_id: anon(1) }, '198.51.100.9', start + 31 * 61_000)).status, 200);
  const g = env(), rcg = revenuecat(); rcg.known.add(anon(1));
  (g.PRODUCTS_DB as D1).raw.prepare('INSERT INTO review_try VALUES (?, ?, ?, ?)').run(`all:${new Date(NOW).toISOString().slice(0, 10)}`, 'all', LIMITS.globalDaily, NOW + DAY);
  const global = await call(g, rcg, { code: CODE, app_user_id: anon(1) });
  assert.equal(global.status, 429); assert.deepEqual(rcg.calls, []);
  // The cap stops the reviewer too, so it files ONE Open Loops row that day, not one per refused try.
  assert.deepEqual(rcg.openLoopStops, ['REVIEW_DAILY_CAP']);
  assert.equal((await call(g, rcg, { code: CODE, app_user_id: anon(2) }, '198.51.100.50')).status, 429);
  assert.deepEqual(rcg.openLoopStops, ['REVIEW_DAILY_CAP']);
});

test('one install: 5 tries a minute and 10 a day whatever network it hops to, refused before the compare and without spending anyone else’s tries', async () => {
  const e = env(), rc = revenuecat(); rc.known.add(anon(1)); rc.known.add(anon(2));
  const start = Date.parse(new Date(NOW).toISOString().slice(0, 10) + 'T00:00:30Z');
  for (let i = 0; i < LIMITS.perInstallBurst; i++) assert.equal((await call(e, rc, { code: '0000000000', app_user_id: anon(1) }, `192.0.2.${i + 1}`, start)).status, 403);
  // The 6th in that minute, from a fresh network with the RIGHT code: refused, never compared, no network or global try spent.
  const ipTries = triesTaken(e, 'ip'), allTries = triesTaken(e);
  const burst = await call(e, rc, { code: CODE, app_user_id: anon(1) }, '192.0.2.50', start);
  assert.equal(burst.status, 429); assert.equal(rc.granted.size, 0); assert.deepEqual(rc.calls, []);
  assert.equal(triesTaken(e, 'ip'), ipTries); assert.equal(triesTaken(e), allTries);
  // Spread over minutes and networks, the 11th try that day is refused the same way.
  for (let i = LIMITS.perInstallBurst; i < LIMITS.perInstallDaily; i++)
    assert.equal((await call(e, rc, { code: '0000000000', app_user_id: anon(1) }, `192.0.2.${i + 1}`, start + i * 61_000)).status, 403);
  const late = await call(e, rc, { code: CODE, app_user_id: anon(1) }, '192.0.2.60', start + 20 * 61_000);
  assert.equal(late.status, 429); assert.equal(rc.granted.size, 0); assert.deepEqual(rc.calls, []);
  assert.equal(triesTaken(e), LIMITS.perInstallDaily, 'refused tries never reach the shared daily budget');
  // Anyone else (the reviewer) still gets in, and the same install is let back in the next UTC day.
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(2) }, '198.51.100.70', start + 21 * 61_000)).status, 200);
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) }, '198.51.100.71', start + DAY)).status, 200);
});

test('IPv6: every address in one /64 is one network, so rotating the low 64 bits buys no extra tries; another /64 is untouched', async () => {
  const e = env(), rc = revenuecat(); rc.known.add(anon(1));
  const start = Date.parse(new Date(NOW).toISOString().slice(0, 10) + 'T00:00:30Z');
  for (let i = 0; i < LIMITS.perIpDaily; i++)
    assert.equal((await call(e, rc, { code: '0000000000', app_user_id: anon(300 + i) }, `2001:db8:aa:bb:${(i + 1).toString(16)}::${i + 7}`, start + i * 61_000)).status, 403);
  const rotated = await call(e, rc, { code: CODE, app_user_id: anon(1) }, '2001:0db8:00aa:00bb:ffff:ffff:ffff:fffe', start + 30 * 61_000);
  assert.equal(rotated.status, 429); assert.equal(rc.granted.size, 0);
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) }, '2001:db8:aa:bc::1', start + 31 * 61_000)).status, 200);
});

test('IPv6 /48: one tunnel-broker block cannot spend the shared day by hopping /64s; its 41st try is refused before the compare and another /48 still gets in', async () => {
  const e = env(), rc = revenuecat(); rc.known.add(anon(1));
  const start = Date.parse(new Date(NOW).toISOString().slice(0, 10) + 'T00:00:30Z');
  // 40 tries, each from its own /64 inside 2001:db8:77::/48 and its own install, all under every per-network cap.
  for (let i = 0; i < LIMITS.perNet48Daily; i++)
    assert.equal((await call(e, rc, { code: '0000000000', app_user_id: anon(400 + i) }, `2001:db8:77:${(i + 1).toString(16)}::9`, start + i * 61_000)).status, 403);
  const before = triesTaken(e);
  const hop = await call(e, rc, { code: CODE, app_user_id: anon(1) }, '2001:db8:77:ffff::1', start + 50 * 61_000);
  assert.equal(hop.status, 429); assert.equal(rc.granted.size, 0); assert.deepEqual(rc.calls, []);
  assert.equal(triesTaken(e), before, 'a refused /48 try never reaches the shared daily budget');
  assert.equal(before, LIMITS.perNet48Daily);
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) }, '2001:db8:78::1', start + 51 * 61_000)).status, 200);
});

test('IPv4-mapped IPv6 (::ffff:a.b.c.d) is the IPv4 it carries: two such callers never share a bucket, and the mapped and plain forms of one address do', async () => {
  // ipPrefix itself, both spellings of the mapped form.
  assert.equal(ipPrefix('::ffff:198.51.100.1'), '198.51.100.1');
  assert.equal(ipPrefix('::FFFF:c633:6402'), '198.51.100.2');
  assert.equal(ipPrefix('2601:3cb:500:15e1:742a:4616:6d6c:4807'), '2601:3cb:500:15e1::/64');
  assert.equal(ipPrefix('2601:3cb:500:15e1:742a:4616:6d6c:4807', 48), '2601:3cb:500::/48');
  const e = env(), rc = revenuecat(); rc.known.add(anon(1));
  const start = Date.parse(new Date(NOW).toISOString().slice(0, 10) + 'T00:00:30Z');
  for (let i = 0; i < LIMITS.perIpDaily; i++)
    assert.equal((await call(e, rc, { code: '0000000000', app_user_id: anon(500 + i) }, '::ffff:198.51.100.1', start + i * 61_000)).status, 403);
  // The same address written plainly is the same caller: refused.
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) }, '198.51.100.1', start + 30 * 61_000)).status, 429);
  // A different IPv4 behind the same mapped prefix is someone else: let in.
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) }, '::ffff:198.51.100.2', start + 31 * 61_000)).status, 200);
});

test('the window is one review, never a standing date: more than 30 days ahead is closed (code, status route and sandbox); exactly 30 is open', async () => {
  const rc = revenuecat(); rc.known.add(anon(1));
  const far = env(d1(), { REVIEW_UNTIL: new Date(NOW + (LIMITS.maxWindowDays * DAY) + 60_000).toISOString() });
  assert.equal((await reviewStatus(far, NOW)).status, 404);
  assert.equal((await call(far, rc, { code: CODE, app_user_id: anon(1) })).status, 404);
  assert.deepEqual(rc.calls, []);
  const edge = env(d1(), { REVIEW_UNTIL: new Date(NOW + LIMITS.maxWindowDays * DAY).toISOString() });
  assert.equal((await reviewStatus(edge, NOW)).status, 200);
  assert.equal((await call(edge, rc, { code: CODE, app_user_id: anon(1) })).status, 200);
  // The live route reads the same rule with the real clock.
  assert.equal((await statusRoute({ env: { ...far } })).status, 404);
  // The dates on file agree: both wrangler.toml blocks name the same REVIEW_UNTIL, inside 30 days of today or already
  // past (closed is safe), and the docs name the same date.
  const toml = readFileSync('../../wrangler.toml', 'utf8');
  const dates = [...toml.matchAll(/^REVIEW_UNTIL = "([^"]+)"$/gm)].map(m => m[1]!);
  assert.equal(dates.length, 2); assert.equal(dates[0], dates[1]);
  assert.ok(Date.parse(dates[0]!) - Date.now() <= LIMITS.maxWindowDays * DAY, `wrangler.toml REVIEW_UNTIL ${dates[0]} is more than ${LIMITS.maxWindowDays} days ahead: the code would stay closed`);
  assert.ok(readFileSync('../../docs/APP_BUNDLE_DELIVERY.md', 'utf8').includes(`REVIEW_UNTIL = ${dates[0]}`), 'docs name the window on file');
});

test('sandbox purchases open the doors only while the switch is on AND the window is open; real purchases never depend on either', async t => {
  const rc = revenuecat();
  t.mock.method(globalThis, 'fetch', rc.fetcher);
  // Every product bought, so every door (bundle, files and both single kits) has a purchase to find.
  const all = [COMPLETE_BUNDLE.productId, 'ap_credit_kit', 'ap_explanation_kit'];
  rc.known.add(anon(5)); rc.bought.set(anon(5), purchases(all, { store: 'app_store', environment: 'sandbox' }));
  rc.known.add(anon(6)); rc.bought.set(anon(6), purchases(all, { store: 'play_store' }));
  rc.known.add(anon(7));
  const open = new Date(Date.now() + 10 * DAY).toISOString(), past = new Date(Date.now() - 60_000).toISOString(), far = new Date(Date.now() + 40 * DAY).toISOString();
  const sandbox = (over: Record<string, unknown>) => env(d1(), { REVIEW_CODE_SECRET: undefined, ...over });
  const noPurchase = await doors(sandbox({ APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: open }), anon(7));
  for (const [k, [status]] of Object.entries(await doors(sandbox({ APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: open }), anon(5)))) assert.equal(status, 200, `open window: ${k}`);
  for (const over of [{ APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: past }, { APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: far },
    { APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: undefined }, { APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: undefined, REVIEW_UNTIL: open }])
    refusedEverywhere(await doors(sandbox(over), anon(5)), noPurchase);
  // A real buyer opens every door with the window closed, missing or open, switch on or off.
  for (const over of [{ REVIEW_UNTIL: past }, { REVIEW_UNTIL: undefined }, { APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: open }, { APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: past }])
    for (const [k, [status]] of Object.entries(await doors(sandbox(over), anon(6)))) assert.equal(status, 200, `buyer ${JSON.stringify(over)}: ${k}`);
  // RevenueCat's purchase list down, switch on and window open: nobody gets in free (sandbox or not).
  rc.purchasesDown(true);
  for (const id of [anon(5), anon(6)]) for (const [k, [status]] of Object.entries(await doors(sandbox({ APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: open }), id)))
    assert.notEqual(status, 200, `RevenueCat down: ${k}`);
});

test('lying client: malformed, custom or oversized IDs and bodies are refused before any count or call; a made-up ID takes no slot', async () => {
  const e = env(), rc = revenuecat();
  for (const body of [{ code: CODE, app_user_id: 'my-own-id' }, { code: CODE, app_user_id: '$RCAnonymousID:xyz' }, { code: CODE }, { app_user_id: anon(1) },
    { code: 4815162342, app_user_id: anon(1) }, 'not json', JSON.stringify({ code: CODE, app_user_id: anon(1), pad: 'x'.repeat(2000) })])
    assert.equal((await call(e, rc, body)).status, 400);
  assert.equal((await reviewUnlock(req({ code: CODE, app_user_id: anon(1) }, undefined, 'text/plain'), e, { now: NOW, fetcher: rc.fetcher })).status, 400);
  // An oversized body with no content-length (streamed) is cut off at 1 KB, not read to the end.
  let pulled = 0;
  const stream = new ReadableStream({ pull(c) { if (pulled++ < 64) c.enqueue(new TextEncoder().encode(' '.repeat(1024))); else c.close(); } });
  assert.equal((await call(e, rc, stream)).status, 400); assert.ok(pulled <= 4, `read ${pulled} KB of an oversized body`);
  assert.equal(triesTaken(e), 0); assert.deepEqual(rc.calls, []);
  const r = await call(e, rc, { code: CODE, app_user_id: anon(99) });
  assert.equal(r.status, 503); assert.equal(slots(e), 0); assert.equal(rc.granted.size, 0);
});

test('leaked code: 10 devices per code version, 2 new per IP a day, the 11th files an Open Loops row; the same ID again takes no slot', async () => {
  const e = env(), rc = revenuecat();
  for (let n = 1; n <= 12; n++) rc.known.add(anon(n));
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) }, '192.0.2.1')).status, 200);
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(2) }, '192.0.2.1')).status, 200);
  const third = await call(e, rc, { code: CODE, app_user_id: anon(3) }, '192.0.2.1');
  assert.equal(third.body.error, 'USED_UP'); assert.equal(slots(e), 2); assert.ok(!rc.granted.has(anon(3)));
  // The same ID again, after its 7 days (row not yet purged): no new slot, a fresh grant.
  const again = await call(e, rc, { code: CODE, app_user_id: anon(1) }, '192.0.2.1', NOW + 8 * DAY);
  assert.equal(again.status, 200); assert.equal(slots(e), 2); assert.equal(rc.granted.get(anon(1)), NOW + 15 * DAY);
  for (let n = 3; n <= 10; n++) assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(n) }, `198.51.100.${n}`)).status, 200);
  assert.equal(slots(e), 10);
  const eleventh = await call(e, rc, { code: CODE, app_user_id: anon(11) }, '198.51.100.200');
  assert.equal(eleventh.body.error, 'USED_UP'); assert.equal(slots(e), 10); assert.ok(!rc.granted.has(anon(11))); assert.equal(rc.openLoops, 1);
  // A new code version is a new window with its own 10 slots.
  assert.equal((await call({ ...e, REVIEW_CODE_VERSION: 'v2' }, rc, { code: CODE, app_user_id: anon(11) }, '198.51.100.201')).status, 200);
});

test('outage: RevenueCat 5xx, timeout or read-only key = 503, slot given back, nothing granted; D1 down = 503 and no call', async () => {
  for (const mode of ['5xx', 'timeout', '403'] as const) {
    const e = env(), rc = revenuecat(); rc.known.add(anon(1)); rc.set(mode);
    const r = await call(e, rc, { code: CODE, app_user_id: anon(1) });
    assert.equal(r.status, 503, mode); assert.equal(r.body.error, 'TRY_AGAIN');
    assert.equal(slots(e), 0, mode); assert.ok(!rc.granted.has(anon(1)), `${mode}: nothing half-granted`);
    // Only the read-only key (no retry fixes it) files an Open Loops row; a passing outage does not.
    assert.deepEqual(rc.openLoopStops, mode === '403' ? ['REVIEW_RC_KEY_READONLY'] : [], mode);
    // The IP's new-device slot really came back: it can still open its two.
    rc.set('ok'); rc.known.add(anon(2));
    assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) })).status, 200);
    assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(2) })).status, 200);
  }
  const db = d1(), e = env(db), rc = revenuecat(); rc.known.add(anon(1)); db.fail(true);
  const r = await call(e, rc, { code: CODE, app_user_id: anon(1) });
  assert.equal(r.status, 503); assert.deepEqual(rc.calls, []);
});

test('outage of the alert itself: Boss OS down, refusing or hanging never delays or changes the read-only-key 503', async t => {
  const log = t.mock.method(console, 'log', () => {});
  for (const [intake, logged] of [['throws', 'OPEN_LOOPS_UNREACHABLE'], ['500', 'OPEN_LOOPS_REFUSED'], ['hangs', 'OPEN_LOOPS_UNREACHABLE']] as const) {
    log.mock.resetCalls();
    const e = env(), rc = revenuecat(); rc.known.add(anon(1)); rc.set('403'); rc.setIntake(intake);
    // The answer comes back while the alert is still in flight (a hung intake has not settled yet).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const r = await Promise.race([call(e, rc, { code: CODE, app_user_id: anon(1) }, undefined, NOW, false), new Promise<'HUNG'>(ok => { timer = setTimeout(() => ok('HUNG'), 500); })]);
    clearTimeout(timer);
    assert.notEqual(r, 'HUNG', `${intake}: the 503 waited on the alert`);
    if (r === 'HUNG') continue;
    assert.equal(r.status, 503, intake); assert.equal(r.body.error, 'TRY_AGAIN');
    assert.equal(slots(e), 0, intake); assert.ok(!rc.granted.has(anon(1)), `${intake}: nothing granted`);
    assert.equal(r.waits.length, 1, `${intake}: the alert is scheduled through waitUntil`);
    rc.release();
    await Promise.all(r.waits);
    assert.deepEqual(rc.openLoopStops, ['REVIEW_RC_KEY_READONLY'], intake);
    const lines = log.mock.calls.map(c => c.arguments.join(' ')).join('\n');
    assert.ok(lines.includes('REVIEW_RC_KEY_READONLY'), intake); assert.ok(lines.includes(logged), `${intake}: logs ${logged}`);
  }
});

test('doors: a live review grant opens the bundle, both kits and the file kits; every other case is refused exactly like no purchase', async t => {
  const db = d1(), e = env(db), rc = revenuecat();
  t.mock.method(globalThis, 'fetch', rc.fetcher);
  for (let n = 1; n <= 4; n++) rc.known.add(anon(n));
  const noPurchase = await doors(e, anon(4));
  for (const k of Object.keys(noPurchase)) assert.equal(noPurchase[k]![0], 403, k);
  // Granted: every door opens.
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) })).status, 200);
  for (const [k, [status]] of Object.entries(await doors(e, anon(1)))) assert.equal(status, 200, k);
  // Revoked in RevenueCat: the row alone opens nothing.
  rc.granted.delete(anon(1));
  refusedEverywhere(await doors(e, anon(1)), noPurchase);
  // Expired row, closed window, old code version, RevenueCat or the review table down: refused.
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) })).status, 200);
  db.raw.prepare('UPDATE review_grant SET expires_at = ?').run(Date.now() - 1);
  refusedEverywhere(await doors(e, anon(1)), noPurchase);
  db.raw.prepare('UPDATE review_grant SET expires_at = ?').run(Date.now() + DAY);
  for (const shut of [{ REVIEW_UNTIL: '2026-01-01' }, { REVIEW_CODE_SECRET: undefined }, { REVIEW_CODE_VERSION: 'v0' }]) refusedEverywhere(await doors({ ...e, ...shut }, anon(1)), noPurchase);
  rc.activeDown(true); refusedEverywhere(await doors(e, anon(1)), noPurchase); rc.activeDown(false);
  db.failOn(/review_grant/); refusedEverywhere(await doors(e, anon(1)), noPurchase); db.failOn(null);
  for (const [k, [status]] of Object.entries(await doors(e, anon(1)))) assert.equal(status, 200, `back open: ${k}`);
  // A sandbox / Test Store / promotional entitlement with no review_grant row of ours opens nothing.
  rc.sandboxEntitled.add(anon(2));
  rc.bought.set(anon(2), [...purchases(COMPLETE_BUNDLE.productId, { store: 'test_store' }), ...purchases(COMPLETE_BUNDLE.productId, { store: 'promotional' })]);
  refusedEverywhere(await doors(e, anon(2)), noPurchase);
  // A forged ID (not anonymous) never reaches the review check.
  refusedEverywhere(await doors(e, 'custom-user'), noPurchase);
});

test('data loss: a buyer who redeems keeps the purchase; window closed or grant gone never hides it; only granted entitlements are ever revoked', async t => {
  const db = d1(), e = env(db), rc = revenuecat();
  t.mock.method(globalThis, 'fetch', rc.fetcher);
  rc.known.add(anon(1)); rc.bought.set(anon(1), purchases(COMPLETE_BUNDLE.productId, { store: 'play_store' }));
  // What the buyer's purchase opens before any review code (the bundle and file doors; single kits come in the bundle).
  const statuses = (d: Record<string, [number, string]>) => Object.fromEntries(Object.entries(d).map(([k, [status]]) => [k, status]));
  const before = statuses(await doors(e, anon(1)));
  assert.equal(before.bundle, 200); assert.equal(before.files, 200);
  assert.equal((await call(e, rc, { code: CODE, app_user_id: anon(1) })).status, 200);
  rc.set('timeout'); await call(e, rc, { code: CODE, app_user_id: anon(1) }); rc.set('ok');
  assert.equal((rc.bought.get(anon(1)) as unknown[]).length, 1);
  // Window closed and the grant gone: the buyer's real purchase still opens every door.
  rc.granted.delete(anon(1));
  assert.deepEqual(statuses(await doors({ ...e, REVIEW_UNTIL: '2026-01-01' }, anon(1))), before);
  assert.deepEqual(statuses(await doors(env(d1(), { REVIEW_CODE_SECRET: undefined }), anon(1))), before);
  assert.deepEqual(statuses(await doors(e, anon(1))), before);
  // Every call made is a read, a grant or a revoke of a GRANTED entitlement: never a purchase or customer change.
  assert.ok(rc.calls.every(c => /^GET |\/actions\/(grant_entitlement|revoke_granted_entitlement)$/.test(c)), rc.calls.join('\n'));
  // Stored: HMACs only, no raw ID or IP.
  const dump = JSON.stringify(db.raw.prepare('SELECT * FROM review_grant').all()) + JSON.stringify(db.raw.prepare('SELECT * FROM review_try').all());
  assert.ok(!dump.includes(anon(1).slice(15)) && !dump.includes('203.0.113.7') && !dump.includes(CODE));
});

test('migrations: additive only, the newest schema_version row is the newest file, and re-applying is a no-op', () => {
  const files = readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();
  const db = d1();
  const rows = () => db.raw.prepare('SELECT migration FROM schema_version ORDER BY migration').all().map(r => (r as { migration: string }).migration);
  assert.equal(rows().at(-1), files.at(-1)!.replace(/\.sql$/, ''));
  const before = JSON.stringify(rows());
  for (const f of files) db.raw.exec(readFileSync(`${MIGRATIONS}/${f}`, 'utf8'));
  assert.equal(JSON.stringify(rows()), before);
  for (const f of files) assert.doesNotMatch(readFileSync(`${MIGRATIONS}/${f}`, 'utf8'), /\b(DROP|ALTER\s+TABLE\s+\w+\s+(DROP|RENAME))\b/i, f);
});

test('the app: bundle only from RevenueCat’s own grant, never from the server alone; no network = hidden link or "try again"', async t => {
  // RevenueCat's promotional bundle grant counts while active; expired, a single-kit grant or nothing does not.
  const future = new Date(Date.now() + DAY).toISOString(), past = new Date(Date.now() - DAY).toISOString();
  const promo = (expirationDate: string | null, store = 'PROMOTIONAL') => ({ [COMPLETE_BUNDLE.productId]: { productIdentifier: `rc_promo_${COMPLETE_BUNDLE.productId}_custom`, expirationDate, store } });
  assert.equal(ownershipFrom(promo(future)).bundle, true);
  assert.equal(ownershipFrom(promo(future)).fileKits!.length, 5);
  assert.equal(ownershipFrom(promo(past)).bundle, false);
  assert.equal(ownershipFrom(promo(null)).bundle, false);
  assert.equal(ownershipFrom({ [KIT.productId]: { productIdentifier: `rc_promo_${KIT.productId}_custom`, expirationDate: future, store: 'PROMOTIONAL' } }).bundle, false);
  assert.equal(ownershipFrom({ [COMPLETE_BUNDLE.productId]: { productIdentifier: COMPLETE_BUNDLE.productId, expirationDate: null } }).bundle, true, 'a real purchase is unchanged');
  const seen: string[] = [];
  let answer = () => new Response('{"error":"NOT_FOUND"}', { status: 404 });
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => { seen.push(`${init?.method ?? 'GET'} ${url} ${init?.body ?? ''}`); return answer(); });
  assert.equal(await reviewWindowOpen(), false);
  answer = () => new Response('{"error":"USED_UP"}', { status: 403 });
  assert.equal(await redeemReviewCode(CODE, anon(1)), 'usedUp');
  answer = () => { throw Error('offline'); };
  assert.equal(await reviewWindowOpen(), false);
  assert.equal(await redeemReviewCode(CODE, anon(1)), 'tryAgain');
  // Not 10 digits, or no anonymous ID: nothing is sent.
  const sent = seen.length;
  assert.equal(await redeemReviewCode('12345', anon(1)), 'wrong');
  assert.equal(await redeemReviewCode(CODE, 'custom-user'), 'tryAgain');
  assert.equal(seen.length, sent);
  assert.ok(seen.every(s => s.includes(REVIEW_URL)));
  assert.deepEqual(Object.keys(JSON.parse(seen[1]!.split(' ').slice(2).join(' '))), ['code', 'app_user_id']);
  // A 200 alone opens nothing: only when RevenueCat then says "bundle" does the bundle download run.
  answer = () => Response.json({ unlocked: true });
  let installs = 0;
  const install = async () => { installs++; return true; };
  const account = (bundle: boolean) => ({ refresh: async () => ({ bundle, creditKit: bundle, explanationKit: bundle, fileKits: [] }), userId: async () => anon(1) });
  assert.equal(await applyReviewCode(CODE, account(false), install), 'tryAgain'); assert.equal(installs, 0);
  assert.equal(await applyReviewCode('481-516-2342', account(true), install), 'unlocked'); assert.equal(installs, 1);
  assert.equal(await applyReviewCode(CODE, account(true), async () => { throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE'); }), 'tryAgain');
  // Android only, store account only, not for a bundle owner; mounted on More under Restore.
  const card = readFileSync('src/ReviewCode.tsx', 'utf8');
  assert.match(card, /if \(Platform\.OS !== 'android'\) return;/);
  assert.match(card, /if \(account\.mock \|\| account\.preview \|\| \(await account\.ownership\(\)\)\.bundle\) return;/);
  assert.match(card, /if \(Platform\.OS !== 'android' \|\| !open\) return null;/);
  assert.match(readFileSync('app/(tabs)/more/index.tsx', 'utf8'), /'Restore a purchase'[\s\S]*<ReviewCode \/>[\s\S]*Bought on approvalprep\.com/);
});

test('the Play reviewer note fits 500 characters, names the screen’s own labels and keeps the self-help line', () => {
  const note = readFileSync('store/google-play/play-console.md', 'utf8').split('## App access')[1]!.match(/^> (.+)$/m)![1]!;
  assert.ok([...note].length <= 500, `${[...note].length} characters`);
  for (const label of ['More', REVIEW_LINK, REVIEW_USE]) assert.ok(note.includes(label), label);
  assert.match(note, /Self-help templates only: the app never contacts a bureau or creditor/);
  assert.doesNotMatch(note, /\d{10}/);
});
