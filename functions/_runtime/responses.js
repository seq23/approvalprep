// Every API answer is personal or stateful (checkout, downloads, sign-ups): never cached.
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', ...headers } });
}
export function methodNotAllowed() { return json({ ok:false, error:'METHOD_NOT_ALLOWED' }, 405); }
export async function readJson(request) { try { return await request.json(); } catch { return {}; } }
/** The body as text, or null when it is larger than `max` bytes (by its content-length, or while streaming when a
 * client sends none or lies): a flood of big bodies is refused before it is buffered or parsed. */
export async function readCapped(request, max) {
  if (Number(request.headers.get('content-length') ?? 0) > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader(), parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => {}); return null; }
    parts.push(value);
  }
  const all = new Uint8Array(size); let at = 0;
  for (const p of parts) { all.set(p, at); at += p.byteLength; }
  return new TextDecoder().decode(all);
}
export function nowIso() { return new Date().toISOString(); }
export function publicBase(env, request) { return env.PUBLIC_SITE_URL || new URL(request.url).origin; }
