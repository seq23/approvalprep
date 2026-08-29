'use strict';
/**
 * The rolling publication window.
 *
 * `data/cadence/policy.json` declares `new_pages_per_week`. Until this file
 * existed, nothing measured a week.
 *
 * The gate counted URLs that were not in `data/cadence/known_urls.json` and
 * compared that count to `new_pages_per_week`. The ledger is advanced by
 * `cadence:gate --accept`, which runs at the end of every clear
 * `scheduled-content-release` run - and that workflow is on `cron: "7 10 * * *"`,
 * once a day. So the baseline reset daily while the cap it was measured against
 * was written per week: a full weekly allowance was handed out every morning.
 *
 * Measured, seven synthetic daily accepts of two URLs each:
 *
 *     day 1  2 urls  CLEAR      day 5  10 urls  CLEAR
 *     day 2  4 urls  CLEAR      day 6  12 urls  CLEAR
 *     day 3  6 urls  CLEAR      day 7  14 urls  CLEAR
 *
 * Fourteen new URLs in seven days against a declared cap of two per week, and
 * the gate never blocked once. The library is already 125 pages against a
 * maintainable ceiling of 104, so the cap was not academic - it was the only
 * thing standing between the tail and the 13-week staleness threshold, and it
 * was running seven times loose.
 *
 * The fix is not a smaller number. It is to give the window a clock. The ledger
 * now carries an append-only `history` of what each accept admitted, and the cap
 * is measured against everything admitted inside the trailing
 * `new_pages_window_days` (7), not against whatever survived the last reset.
 *
 * This is deliberately a .cjs file with no dependencies. `scripts/cadence_gate.cjs`
 * requires it directly, and `scripts/lib/publication_budget.mjs` reaches it through
 * `createRequire`, so the gate and the generators' budget cannot drift into two
 * different opinions about how much of the week is left - which is the exact
 * failure the publication budget was written to end, reappearing one level up.
 */

const DEFAULT_WINDOW_DAYS = 7;

/** Days between two YYYY-MM-DD dates, positive when `later` is after `earlier`. */
function daysBetween(later, earlier) {
  return Math.floor((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86400000);
}

function windowDays(policy) {
  const parsed = Number((policy || {}).new_pages_window_days);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WINDOW_DAYS;
}

/**
 * How many publications the ledger's own history says were admitted inside the
 * trailing window ending `today`.
 *
 * An absent or unreadable history returns 0. That is the pre-existing behaviour
 * and it is deliberately the permissive direction: a ledger written before this
 * file existed must not retroactively block a lane. The first `--accept` after
 * this ships starts the history, and the window is real from then on.
 */
function spentInWindow(ledger, today, policy) {
  const history = ledger && Array.isArray(ledger.history) ? ledger.history : [];
  const span = windowDays(policy);
  let spent = 0;
  for (const entry of history) {
    if (!entry || typeof entry.date !== 'string') continue;
    const age = daysBetween(today, entry.date);
    if (!Number.isFinite(age) || age < 0 || age >= span) continue;
    const added = Number(entry.added);
    if (Number.isFinite(added) && added > 0) spent += added;
  }
  return spent;
}

/**
 * Append one accept to the history.
 *
 * Append-only, and idempotent within a day: two accepts on the same date sum
 * into one entry rather than the second erasing the first. A re-run must never
 * be able to overwrite the window with a smaller number - that would restore the
 * self-clearing behaviour this replaces, just on a slower clock.
 *
 * Entries older than two windows are dropped. Nothing inside the window is ever
 * rewritten, so a re-run cannot null out a day that was already spent.
 */
function recordAccept(ledger, today, added, policy) {
  const span = windowDays(policy);
  const prior = (ledger && Array.isArray(ledger.history) ? ledger.history : [])
    .filter((entry) => entry && typeof entry.date === 'string' && Number.isFinite(Number(entry.added)))
    .filter((entry) => {
      const age = daysBetween(today, entry.date);
      return Number.isFinite(age) && age >= 0 && age < span * 2;
    });
  const sameDay = prior.find((entry) => entry.date === today);
  if (sameDay) sameDay.added = Number(sameDay.added) + Math.max(0, Number(added) || 0);
  else prior.push({ date: today, added: Math.max(0, Number(added) || 0) });
  prior.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return prior;
}

/**
 * The remaining allowance: the declared rate minus what the window already holds
 * minus what is new-but-not-yet-accepted in the tree right now.
 *
 * Never negative, and never larger than the declared cap.
 */
function remainingAllowance({ cap, ledger, today, policy, alreadyNew }) {
  const spent = spentInWindow(ledger, today, policy);
  const pending = Math.max(0, Number(alreadyNew) || 0);
  return {
    cap,
    windowDays: windowDays(policy),
    spentInWindow: spent,
    alreadyNew: pending,
    remaining: Math.max(0, cap - spent - pending),
    overBy: Math.max(0, spent + pending - cap),
  };
}

module.exports = { DEFAULT_WINDOW_DAYS, daysBetween, windowDays, spentInWindow, recordAccept, remainingAllowance };
