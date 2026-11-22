// Google Play review access. ApprovalPrep has no accounts, so a store reviewer reaches every paid kit with ONE
// 10-digit code typed on More > "Have a review code?" (Android only). The code lives only in the Pages secret
// REVIEW_CODE, the Boss OS vault (AP_PLAY_REVIEW_CODE) and Play Console's private sign-in details: never in the app
// or this public repo. The right code asks RevenueCat to grant this phone's anonymous purchase ID the Complete Bundle
// entitlement for 7 days; RevenueCat then answers "bundle" to the app exactly as for a buyer, and the content doors
// (app-unlock, app-bundle, app-files) accept the grant through reviewGrantLive below. Nothing here or in the app
// decides "paid" on its own. One contract with Peace Be Still's worker/src/review.ts and KeepMyProof's
// site/server/review.mjs: ~/Work/google-play-2026-11-21/REVIEW-UNLOCK-DESIGN.md section 3.
//
// Order: window -> body and ID format -> try limits (atomic, BEFORE the compare) -> constant-time compare -> ID known
// to RevenueCat -> per-IP new-slot limit -> device slot (cap REVIEW_MAX_DEVICES per code version) -> grant. Any
// RevenueCat failure revokes what this call granted (granted entitlements only, never a purchase), gives the slot
// back and answers 503: never half-granted.
// Stored (PRODUCTS_DB, migrations/0002_review.sql): HMACs of the ID and the IP (REVIEW_HASH_SECRET), the code
// version, timestamps. Never a raw ID, IP or code. Self-help only: this unlocks the same templates a buyer gets.
import { REVENUECAT_PROJECT } from './revenuecat.js';

// RevenueCat's own id for the ap_complete_bundle entitlement (read from GET /v2/projects/projf63ea019/entitlements,
// 22 Nov 2026): an identifier, not a secret. The bundle opens both kits and the five file kits (ownsBundle).
export const BUNDLE_ENTITLEMENT = 'entl0ed811eba7';
export const RC = `https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT}`;
export const LIMITS = { perIpDaily: 20, globalDaily: 1000, burstPerMinute: 5, newSlotsPerIpDaily: 2, maxDevices: 10 };
const CODE = /^\d{10}$/;
const ANON_ID = /^\$RCAnonymousID:[0-9a-f]{32}$/;
const DAY = 86_400_000, WEEK = 7 * DAY, MAX_BODY = 1024;
const OPEN_LOOPS_INTAKE = 'https://boss.sequoiataylor.com/api/boss/open-loops/intake';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const closed = () => json({ error: 'NOT_FOUND' }, 404);
const stop = (code) => console.log(JSON.stringify({ event: 'NAMED_STOP', stop: code, where: 'review' }));

/** Open only when every secret and binding it needs is present, the code is 10 digits and REVIEW_UNTIL is in the future. */
export function reviewOpen(env, now = Date.now()) {
  const until = Date.parse(env?.REVIEW_UNTIL ?? '');
  return CODE.test(env?.REVIEW_CODE ?? '') && Number.isFinite(until) && until > now &&
    /^[A-Za-z0-9._-]{1,32}$/.test(env?.REVIEW_CODE_VERSION ?? '') && (env?.REVIEW_HASH_SECRET ?? '').length >= 32 &&
    !!env?.APPROVALPREP_REVENUECAT_SECRET && !!env?.PRODUCTS_DB;
}

const maxDevices = (env) => { const n = Number(env.REVIEW_MAX_DEVICES ?? LIMITS.maxDevices); return Number.isInteger(n) && n > 0 && n <= 50 ? n : LIMITS.maxDevices; };

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const idHashOf = async (env, id) => hex(await hmac(env.REVIEW_HASH_SECRET, `id:${id}`));
/** Constant time: both sides are HMAC'd to 32 bytes first, then every byte is compared. */
async function same(secret, typed, real) {
  const [a, b] = await Promise.all([hmac(secret, `code:${typed}`), hmac(secret, `code:${real}`)]);
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** One atomic try against a cap: true when taken, false when the bucket is full. */
async function take(db, bucket, key, cap, until) {
  const row = await db.prepare('INSERT INTO review_try (bucket, key, tries, until) VALUES (?, ?, 1, ?) ON CONFLICT(bucket, key) DO UPDATE SET tries = tries + 1 WHERE tries < ? RETURNING tries')
    .bind(bucket, key, until, cap).first();
  return !!row;
}
const giveBack = (db, bucket, key) => db.prepare('UPDATE review_try SET tries = tries - 1 WHERE bucket = ? AND key = ? AND tries > 0').bind(bucket, key).run();

const customer = (env, id, fetcher, path = '', init = {}) => fetcher(`${RC}/customers/${encodeURIComponent(id)}${path}`, {
  ...init, headers: { authorization: `Bearer ${env.APPROVALPREP_REVENUECAT_SECRET}`, 'content-type': 'application/json', accept: 'application/json' },
  signal: AbortSignal.timeout(8000), redirect: 'manual',
});

export async function reviewStatus(env, now = Date.now()) {
  return reviewOpen(env, now) ? json({ open: true }) : closed();
}

/**
 * POST /api/review/unlock { code, app_user_id }. `fetcher` reaches RevenueCat and the Open Loops intake; `waitUntil`
 * keeps the Open Loops post alive after the answer.
 */
export async function reviewUnlock(request, env, { now = Date.now(), fetcher = fetch, waitUntil = (p) => p } = {}) {
  if (!reviewOpen(env, now)) return closed();
  // Body: JSON only, at most 1 KB, a code and RevenueCat's anonymous ID. Anything else is refused before any count or call.
  const length = Number(request.headers.get('content-length') ?? 0);
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '') || length > MAX_BODY) return json({ error: 'BAD_REQUEST' }, 400);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'BAD_REQUEST' }, 400);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'BAD_REQUEST' }, 400); }
  const code = body?.code, id = body?.app_user_id;
  if (typeof code !== 'string' || typeof id !== 'string' || !ANON_ID.test(id)) return json({ error: 'BAD_REQUEST' }, 400);

  const db = env.PRODUCTS_DB, secret = env.REVIEW_HASH_SECRET, version = env.REVIEW_CODE_VERSION;
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const ipHash = hex(await hmac(secret, `ip:${ip}`)), idHash = await idHashOf(env, id);
  const day = new Date(now).toISOString().slice(0, 10), minute = Math.floor(now / 60_000);
  try {
    // Expired rows first: try counters past their day or minute, grants 7 days past expiry.
    await db.prepare('DELETE FROM review_try WHERE until < ?').bind(now).run();
    await db.prepare('DELETE FROM review_grant WHERE expires_at + ? < ?').bind(WEEK, now).run();
    // Limits, taken before the code is compared, so guessing costs a try whatever the guess.
    if (!(await take(db, `burst:${minute}`, ipHash, LIMITS.burstPerMinute, (minute + 2) * 60_000))) return json({ error: 'SLOW_DOWN' }, 429);
    if (!(await take(db, `ip:${day}`, ipHash, LIMITS.perIpDaily, now + 2 * DAY))) { stop('REVIEW_IP_DAILY_CAP'); return json({ error: 'SLOW_DOWN' }, 429); }
    if (!(await take(db, `all:${day}`, 'all', LIMITS.globalDaily, now + 2 * DAY))) { stop('REVIEW_DAILY_CAP'); return json({ error: 'SLOW_DOWN' }, 429); }
  } catch { stop('REVIEW_DB_UNAVAILABLE'); return json({ error: 'TRY_AGAIN' }, 503); }

  if (!CODE.test(code) || !(await same(secret, code, env.REVIEW_CODE))) { stop('REVIEW_CODE_WRONG'); return json({ error: 'WRONG_CODE' }, 403); }

  // The ID must be one RevenueCat already knows (the SDK creates it on first launch): a made-up ID takes no slot.
  try {
    const known = await customer(env, id, fetcher);
    if (known.status === 404) { stop('REVIEW_ID_UNKNOWN'); return json({ error: 'TRY_AGAIN' }, 503); }
    if (!known.ok) throw Error(`HTTP_${known.status}`);
  } catch { stop('REVIEW_RC_UNAVAILABLE'); return json({ error: 'TRY_AGAIN' }, 503); }

  // Device slot: the same ID again takes no new slot (and gets a fresh grant); a new ID takes one of REVIEW_MAX_DEVICES,
  // and one IP may open at most 2 new slots a day, so a leaked code cannot burn every slot at once.
  const expires = Math.min(now + WEEK, Date.parse(env.REVIEW_UNTIL));
  let newSlot = false, ipSlot = false;
  try {
    const had = await db.prepare('SELECT 1 AS x FROM review_grant WHERE window_id = ? AND id_hash = ?').bind(version, idHash).first();
    if (!had) {
      if (!(await take(db, `slot:${day}`, ipHash, LIMITS.newSlotsPerIpDaily, now + 2 * DAY))) { stop('REVIEW_IP_SLOT_CAP'); return json({ error: 'USED_UP' }, 403); }
      ipSlot = true;
      const row = await db.prepare('INSERT INTO review_grant (window_id, id_hash, granted_at, expires_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM review_grant WHERE window_id = ?) < ? ON CONFLICT(window_id, id_hash) DO NOTHING RETURNING id_hash')
        .bind(version, idHash, now, expires, version, maxDevices(env)).first();
      if (!row) {
        await giveBack(db, `slot:${day}`, ipHash);
        stop('REVIEW_DEVICE_CAP');
        waitUntil(fileCapLoop(env, fetcher));
        return json({ error: 'USED_UP' }, 403);
      }
      newSlot = true;
    }
  } catch {
    if (ipSlot) await giveBack(db, `slot:${day}`, ipHash).catch(() => {});
    stop('REVIEW_DB_UNAVAILABLE'); return json({ error: 'TRY_AGAIN' }, 503);
  }

  const undo = async () => {
    if (newSlot) await db.prepare('DELETE FROM review_grant WHERE window_id = ? AND id_hash = ?').bind(version, idHash).run().catch(() => {});
    if (ipSlot) await giveBack(db, `slot:${day}`, ipHash).catch(() => {});
  };
  try {
    const res = await customer(env, id, fetcher, '/actions/grant_entitlement', { method: 'POST', body: JSON.stringify({ entitlement_id: BUNDLE_ENTITLEMENT, expires_at: expires }) });
    if (res.status === 403) { stop('REVIEW_RC_KEY_READONLY'); await undo(); return json({ error: 'TRY_AGAIN' }, 503); }
    if (!res.ok) throw Error(`HTTP_${res.status}`);
  } catch {
    // A timeout may still have granted: revoke what this call may have granted, give the slot back, answer "try again".
    await customer(env, id, fetcher, '/actions/revoke_granted_entitlement', { method: 'POST', body: JSON.stringify({ entitlement_id: BUNDLE_ENTITLEMENT }) }).catch(() => {});
    await undo();
    stop('REVIEW_RC_UNAVAILABLE'); return json({ error: 'TRY_AGAIN' }, 503);
  }
  if (!newSlot) await db.prepare('UPDATE review_grant SET granted_at = ?, expires_at = ? WHERE window_id = ? AND id_hash = ?').bind(now, expires, version, idHash).run().catch(() => {});
  console.log(JSON.stringify({ event: 'REVIEW_UNLOCKED', where: 'review' }));
  return json({ unlocked: true });
}

/**
 * The doors' second way in (the first is a real store purchase, checked before this and never changed by it):
 * true only while the window is open, this ID has a review_grant row for the CURRENT code version that has not
 * expired, AND RevenueCat still lists the bundle entitlement as active for it. So a revoke in RevenueCat, an expiry
 * or a closed window ends the doors and the app at once; a sandbox or Test Store entitlement with no row never opens
 * a door. Any error (D1 or RevenueCat down) is false: fail closed.
 */
export async function reviewGrantLive(env, id, { now = Date.now(), fetcher = fetch } = {}) {
  try {
    if (!reviewOpen(env, now) || typeof id !== 'string' || !ANON_ID.test(id)) return false;
    const row = await env.PRODUCTS_DB.prepare('SELECT expires_at FROM review_grant WHERE window_id = ? AND id_hash = ?').bind(env.REVIEW_CODE_VERSION, await idHashOf(env, id)).first();
    if (!row || !(Number(row.expires_at) > now)) return false;
    const res = await customer(env, id, fetcher, '/active_entitlements?limit=100');
    if (!res.ok) return false;
    const items = (await res.json())?.items;
    return Array.isArray(items) && items.some((e) => e?.entitlement_id === BUNDLE_ENTITLEMENT && (e.expires_at == null || Number(e.expires_at) > now));
  } catch { return false; }
}

/** The cap was hit: a row on Boss OS's Open Loops list, so it is seen, not only logged. */
async function fileCapLoop(env, fetcher) {
  if (!env.BOSS_OPEN_LOOPS_TOKEN) { stop('OPEN_LOOPS_TOKEN_MISSING'); return; }
  try {
    const r = await fetcher(OPEN_LOOPS_INTAKE, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.BOSS_OPEN_LOOPS_TOKEN}` },
      body: JSON.stringify({ repo: 'seq23/approvalprep', stop: 'REVIEW_DEVICE_CAP', business: 'spry', finish_line: 'ApprovalPrep: live in both stores, selling', owner: 'claude',
        title: 'ApprovalPrep: the Play review code is used up', next_step: `All ${maxDevices(env)} review slots for code version ${env.REVIEW_CODE_VERSION} are taken. Rotate: new AP_PLAY_REVIEW_CODE in the vault, new REVIEW_CODE + REVIEW_CODE_VERSION on the Pages project, then she pastes the new code in Play Console.` }),
      signal: AbortSignal.timeout(8000) });
    if (!r.ok) stop('OPEN_LOOPS_REFUSED');
  } catch { stop('OPEN_LOOPS_UNREACHABLE'); }
}
