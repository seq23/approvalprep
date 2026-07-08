export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}
export function methodNotAllowed() { return json({ ok:false, error:'METHOD_NOT_ALLOWED' }, 405); }
export async function readJson(request) { try { return await request.json(); } catch { return {}; } }
export function nowIso() { return new Date().toISOString(); }
export function publicBase(env, request) { return env.PUBLIC_SITE_URL || new URL(request.url).origin; }
