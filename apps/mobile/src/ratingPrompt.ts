import type { LetterDatabase } from './letterStorage';
// The one store rating ask (launch kit, 21 Nov 2026). It uses only the platform's own sheet
// (expo-store-review: SKStoreReviewController on iOS, Play In-App Review on Android), which
// decides itself whether to show and caps how often (Apple: 3 times in 365 days). On top of that:
// - it follows a real success only: a letter saved as mailed, after the save succeeded;
// - never in the first day after the app was first opened, and never on the web preview;
// - at most once per install, whatever the platform would allow;
// - no satisfaction question before the sheet (review gating is banned by Google policy and the FTC).
export const FIRST_DAY_MS = 86_400_000;

export interface ReviewSheet { isAvailableAsync(): Promise<boolean>; requestReview(): Promise<void> }
export interface RatingState { firstOpenedAt(now: Date): Promise<Date>; asked(): Promise<boolean>; markAsked(now: Date): Promise<void> }

/** The ask state lives beside the letters, on this phone only. */
export async function ratingState(db: LetterDatabase): Promise<RatingState> {
  await db.execAsync('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
  const read = async (key: string) => (await db.getAllAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', key))[0]?.value;
  return {
    async firstOpenedAt(now) {
      const saved = await read('first_opened_at');
      if (saved && Number.isFinite(Date.parse(saved))) return new Date(saved);
      await db.runAsync('INSERT OR IGNORE INTO app_state (key, value) VALUES (?, ?)', 'first_opened_at', now.toISOString());
      return new Date((await read('first_opened_at')) ?? now.toISOString());
    },
    async asked() { return !!await read('rating_asked_at'); },
    async markAsked(now) { await db.runAsync('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', 'rating_asked_at', now.toISOString()); },
  };
}

export type RatingResult = 'asked' | 'already-asked' | 'first-day' | 'unavailable' | 'failed';

/** Call only after a letter is saved as mailed. Never throws: a rating ask must not spoil the save. */
export async function askForRatingAfterMailing(deps: { state: RatingState; sheet: ReviewSheet }, now = new Date()): Promise<RatingResult> {
  try {
    if (await deps.state.asked()) return 'already-asked';
    const first = await deps.state.firstOpenedAt(now);
    if (now.getTime() - first.getTime() < FIRST_DAY_MS) return 'first-day';
    if (!await deps.sheet.isAvailableAsync()) return 'unavailable';
    // Marked before the sheet opens, so a crash mid-sheet can never lead to a second ask.
    await deps.state.markAsked(now);
    await deps.sheet.requestReview();
    return 'asked';
  } catch { return 'failed'; }
}
