// Which days a weekly Pinterest count covers: every day since the last count, not a fixed
// 7 days (6 Nov 2026: moving the count from Monday to Saturday left 27-30 Oct outside every
// week). The window starts where the newest recorded week ended; a week written before
// `until` was recorded ended 7 days after its `since`. With no earlier week: 7 days back.
export function windowStart(prev, now) {
  const last = (prev?.weeks || [])[0];
  const fallback = new Date(now.getTime() - 7 * 86400000).toISOString();
  if (!last) return fallback;
  const end = last.until || (last.since ? new Date(Date.parse(last.since) + 7 * 86400000).toISOString() : null);
  if (!end || !(Date.parse(end) < now.getTime())) return fallback;
  return end;
}
