import * as StoreReview from 'expo-store-review';
import { phoneDatabase } from './phoneDatabase';
import { askForRatingAfterMailing, ratingState } from './ratingPrompt';
/** The one rating ask after a letter is saved as mailed (src/ratingPrompt.ts holds the rules). */
export async function askForRatingAfterSave() {
  try {
    const state = await ratingState(await phoneDatabase('approvalprep-letters.db'));
    return await askForRatingAfterMailing({ state, sheet: StoreReview });
  } catch { return 'failed' as const; }
}
/** Recorded on every app open, so "never in the first day" counts from the first open. */
export async function noteAppOpened() {
  try { await (await ratingState(await phoneDatabase('approvalprep-letters.db'))).firstOpenedAt(new Date()); } catch {}
}
