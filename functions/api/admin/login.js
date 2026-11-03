import { json, readJson } from '../../_runtime/responses.js';
import { createAdminSession } from '../../_runtime/admin.js';
import { safeEqual } from '../../_runtime/rate-limit.js';
import { adminLockedOut, lockedOutResponse, recordAdminFailure } from '../../_runtime/admin-lockout.js';
// 10 wrong passwords from one IP in 15 minutes locks that IP out (functions/_runtime/admin-lockout.js).
export async function onRequestPost({ request, env }) {
  if (await adminLockedOut(request, env)) return lockedOutResponse();
  const body = await readJson(request);
  if (!env.ADMIN_GATE_PASSWORD || !(await safeEqual(body.password, env.ADMIN_GATE_PASSWORD))) {
    await recordAdminFailure(request, env);
    return json({ ok: false, error: 'INVALID_PASSWORD' }, 401);
  }
  if (!env.ADMIN_SESSION_SECRET) return json({ ok: false, error: 'MISSING_ADMIN_SESSION_SECRET' }, 500);
  const s = await createAdminSession(env);
  return json({ ok: true, token: s.token, expiresAt: s.expiresAt }, 200, { 'set-cookie': `ap_admin=${s.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800` });
}
