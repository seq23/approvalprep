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

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
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
