import { json, readJson } from '../../_runtime/responses.js';
import { createAdminSession } from '../../_runtime/admin.js';
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!env.ADMIN_GATE_PASSWORD || body.password !== env.ADMIN_GATE_PASSWORD) return json({ ok: false, error: 'INVALID_PASSWORD' }, 401);
  if (!env.ADMIN_SESSION_SECRET) return json({ ok: false, error: 'MISSING_ADMIN_SESSION_SECRET' }, 500);
  const s = await createAdminSession(env);
  return json({ ok: true, token: s.token, expiresAt: s.expiresAt }, 200, { 'set-cookie': `ap_admin=${s.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800` });
}
