// Fixed-window counters in D1 for endpoints that send email. Every counter is keyed by a bucket
// name plus its window number, so a new window starts at zero; rows older than two days are swept.
// Callers pass hashed identifiers only (never a raw IP or address).
export const RATE_LIMIT_DDL = 'CREATE TABLE IF NOT EXISTS email_rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, window_end INTEGER NOT NULL)';
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export async function sha256(value) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value))));
}

/** IPv6 is cut to its /64: one home or phone holds a whole /64, so the full address would give one person 2^64
 * "IPs" and make every per-IP limit meaningless. IPv4 is kept whole. Same rule as peace-be-still worker/src/iphash.ts. */
export function ipPrefix(ip) {
  const text = String(ip || '').trim().toLowerCase();
  if (!text.includes(':')) return text || 'unknown';
  const [head, tail = ''] = text.split('::');
  const left = head ? head.split(':') : [], right = tail ? tail.split(':') : [];
  const groups = text.includes('::') ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left;
  return groups.slice(0, 4).map((g) => (parseInt(g || '0', 16) || 0).toString(16)).join(':') + '::/64';
}

/** The caller's network for limits: Cloudflare's own header (a client cannot set it at the edge), IPv6 as its /64. */
export function clientIp(request) {
  return ipPrefix(request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown');
}

/** Counts one hit; returns true while the bucket is within its limit for the current window. */
export async function withinLimit(db, name, limit, windowMs, now = Date.now()) {
  const win = Math.floor(now / windowMs);
  const windowEnd = (win + 1) * windowMs;
  await db.prepare(RATE_LIMIT_DDL).run();
  if (Math.random() < 0.02) await db.prepare('DELETE FROM email_rate_limits WHERE window_end < ?').bind(now - 2 * DAY).run();
  const row = await db.prepare('INSERT INTO email_rate_limits (bucket, count, window_end) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 RETURNING count')
    .bind(`${name}:${win}`, windowEnd).first();
  return Number(row?.count ?? Infinity) <= limit;
}

/** Reads a bucket's count in the current window without counting a hit. */
export async function hitsInWindow(db, name, windowMs, now = Date.now()) {
  await db.prepare(RATE_LIMIT_DDL).run();
  const row = await db.prepare('SELECT count FROM email_rate_limits WHERE bucket = ?').bind(`${name}:${Math.floor(now / windowMs)}`).first();
  return Number(row?.count ?? 0);
}

/** Constant-time string comparison (compares SHA-256 digests, so lengths never leak). */
export async function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !b) return false;
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
