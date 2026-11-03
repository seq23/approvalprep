import { json } from './responses.js';
import { clientIp, hitsInWindow, sha256, withinLimit } from './rate-limit.js';

// Per-IP lockout for every way the admin password is tried: POST /api/admin/login and the
// x-admin-password header accepted by requireAdmin (security sweep row 11, 3 Nov 2026).
// 10 wrong passwords from one IP in a 15-minute window locks that IP out until the window ends,
// even for the right password. Counted in D1 by a hash of the IP, never the IP itself.
export const ADMIN_LOCKOUT = { maxFailures: 10, windowMs: 15 * 60_000 };
const bucket = async (request) => `admin-fail:ip:${await sha256(clientIp(request))}`;

export async function adminLockedOut(request, env, now = Date.now()) {
  if (!env.PRODUCTS_DB) return false;
  return (await hitsInWindow(env.PRODUCTS_DB, await bucket(request), ADMIN_LOCKOUT.windowMs, now)) >= ADMIN_LOCKOUT.maxFailures;
}

export async function recordAdminFailure(request, env, now = Date.now()) {
  if (env.PRODUCTS_DB) await withinLimit(env.PRODUCTS_DB, await bucket(request), ADMIN_LOCKOUT.maxFailures, ADMIN_LOCKOUT.windowMs, now);
}

export const lockedOutResponse = () =>
  json({ ok: false, error: 'Too many wrong tries. Wait 15 minutes, then try again.' }, 429, { 'retry-after': String(ADMIN_LOCKOUT.windowMs / 1000) });
