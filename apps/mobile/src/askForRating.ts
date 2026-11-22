import * as StoreReview from 'expo-store-review';
import { phoneDatabase } from './phoneDatabase';
import { askForRatingAfterMailing, ratingState } from './ratingPrompt';
/** The one rating ask after a letter is saved as mailed (src/ratingPrompt.ts holds the rules). */
// Two saves close together share one ask, so the once-per-install claim cannot race.
let inFlight: ReturnType<typeof askForRatingAfterMailing> | undefined;
export function askForRatingAfterSave() {
  return inFlight ??= (async () => {
    try {
      const state = await ratingState(await phoneDatabase('approvalprep-letters.db'));
      return await askForRatingAfterMailing({ state, sheet: StoreReview });
    } catch { return 'failed' as const; } finally { inFlight = undefined; }
  })();
}
/** Recorded on every app open, so "never in the first day" counts from the first open. */
export async function noteAppOpened() {
  try { await (await ratingState(await phoneDatabase('approvalprep-letters.db'))).firstOpenedAt(new Date()); } catch {}
}
