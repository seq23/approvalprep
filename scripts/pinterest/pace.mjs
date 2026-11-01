// The Pinterest stop rule (spry brain, Growth playbook, 1 Nov 2026): 0 clicks at 4
// weeks -> new format; 8 weeks -> pause (never delete). Read from
// data/pinterest/metrics.json weeks (only a MEASURED file counts; a named stop is not
// a zero). config.PACE = { since, review_after_days, fallback: { layouts }, fell_back_at,
// paused_at, log }. Applied daily by scripts/pinterest/refill_queue.mjs.
import { addDays } from "../../src/lib/pinfeed-core.mjs";

/** { action: 'keep' | 'fallback' | 'pause', reason } */
export function decidePace(config, metrics, today) {
  const pace = config.PACE;
  if (!pace?.since) return { action: "keep", reason: "no pace rule configured" };
  if (pace.paused_at) return { action: "pause", reason: `paused since ${pace.paused_at}` };
  const from = pace.fell_back_at ?? pace.since;
  const due = addDays(from, pace.review_after_days ?? 28);
  if (today < due) return { action: "keep", reason: `review on ${due}` };
  if (metrics?.state !== "MEASURED") return { action: "keep", reason: "the newest measurement is not MEASURED" };
  const weeks = (metrics.weeks || []).filter((w) => w.weekEnding >= from && Number.isFinite(Number(w.pinterestViews)));
  if (weeks.length < 4) return { action: "keep", reason: `only ${weeks.length} measured week(s) since ${from}; 4 needed` };
  const visits = weeks.reduce((a, w) => a + Number(w.pinterestViews), 0);
  if (visits > 0) return { action: "keep", reason: `${visits} Pinterest visit(s) in ${weeks.length} measured weeks since ${from}` };
  if (!pace.fell_back_at) return { action: "fallback", reason: `0 Pinterest visits in ${weeks.length} measured weeks since ${from}` };
  return { action: "pause", reason: `0 Pinterest visits in ${weeks.length} measured weeks since the new format on ${from}` };
}

/** New format: future pins use the fallback layouts; logged. Mutates queue. */
export function applyFallback(queue, today, reason) {
  const pace = queue.config.PACE;
  pace.fell_back_at = today;
  pace.log = [...(pace.log || []), { at: today, change: `new format: layouts ${pace.fallback.layouts.join("/")}`, why: reason }];
  let i = 0;
  for (const v of queue.items) if (v.releaseDate > today) v.layout = pace.fallback.layouts[i++ % pace.fallback.layouts.length];
  return queue;
}

/** Pause (never delete): unreleased pins leave the queue's schedule into PACE.parked; logged once. */
export function applyPause(queue, today, reason) {
  const pace = queue.config.PACE;
  if (!pace.paused_at) {
    pace.paused_at = today;
    pace.log = [...(pace.log || []), { at: today, change: "paused: no new pins released; published pins stay", why: reason }];
  }
  const parked = queue.items.filter((v) => v.releaseDate > today);
  pace.parked = [...(pace.parked || []), ...parked.map((v) => ({ ...v, releaseDate: null }))];
  queue.items = queue.items.filter((v) => v.releaseDate <= today);
  return queue;
}
