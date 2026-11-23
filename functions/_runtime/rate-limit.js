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

/** The caller's network for limits. IPv4 is kept whole. IPv6 is cut to its /64 (bits 64): one home or phone holds a whole
 * /64, so the full address would give one person 2^64 "IPs" and make every per-IP limit meaningless. bits 48 gives the
 * site-sized block one tunnel-broker account hands out (65,536 /64s), for a cap one level up (review.js). An IPv4-mapped
 * IPv6 address (::ffff:192.0.2.1 or ::ffff:c000:201) is the IPv4 it carries, so such callers never share one bucket.
 * Same rule as peace-be-still worker/src/iphash.ts. */
export function ipPrefix(ip, bits = 64) {
  const text = String(ip || '').trim().toLowerCase();
  if (!text.includes(':')) return text || 'unknown';
  const [head, tail = ''] = text.split('::');
  const hexGroups = (part) => (part ? part.split(':') : []).flatMap((g) => {
    if (!g.includes('.')) return [g];
    const o = g.split('.').map(Number); // a dotted IPv4 tail fills the last two groups
    return [((o[0] << 8) | o[1]).toString(16), ((o[2] << 8) | o[3]).toString(16)];
  });
  const left = hexGroups(head), right = hexGroups(tail);
  const groups = (text.includes('::') ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left)
    .map((g) => parseInt(g || '0', 16) || 0);
  if (groups.length === 8 && groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff)
    return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join('.');
  return groups.slice(0, bits / 16).map((g) => g.toString(16)).join(':') + `::/${bits}`;
}

/** The caller's network: Cloudflare's own header (a client cannot set it at the edge), IPv6 as its /64 (or /48). */
export function clientIp(request, bits = 64) {
  return ipPrefix(request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown', bits);
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
