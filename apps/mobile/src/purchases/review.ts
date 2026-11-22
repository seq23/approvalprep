// Google Play's reviewer only: the collapsed "Have a review code?" link on More (src/ReviewCode.tsx), shown on
// Android, with the store account, while she does not own the bundle and approvalprep.com says a review window is
// open. It sends only the typed code and RevenueCat's anonymous purchase ID, never a letter or an answer. The server
// (functions/_runtime/review.js) checks the code and asks RevenueCat for a 7-day Complete Bundle grant; the app then
// re-reads RevenueCat. Nothing here decides "paid": only RevenueCat's own answer does.
import type { BundleOwnership } from './bundleOffers';
export const REVIEW_URL = 'https://approvalprep.com/api/review';
export type ReviewResult = 'unlocked' | 'wrong' | 'usedUp' | 'slow' | 'tryAgain';
const ANON_ID = /^\$RCAnonymousID:[0-9a-f]{32}$/;

async function call(unlock: boolean, body?: string): Promise<Response> {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 10_000);
  try {
    return unlock
      ? await fetch(`${REVIEW_URL}/unlock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: abort.signal })
      : await fetch(REVIEW_URL, { signal: abort.signal });
  } finally { clearTimeout(timer); }
}

/** True only when the server answers 200: a closed window, an error or no network all hide the link. */
export async function reviewWindowOpen(): Promise<boolean> {
  try { return (await call(false)).status === 200; } catch { return false; }
}

/** One redeem. Never throws: no network, a timeout or any odd answer is "try again", never "paid". */
export async function redeemReviewCode(code: string, appUserId: string | null): Promise<ReviewResult> {
  if (!/^\d{10}$/.test(code)) return 'wrong';
  if (!appUserId || !ANON_ID.test(appUserId)) return 'tryAgain';
  try {
    const res = await call(true, JSON.stringify({ code, app_user_id: appUserId }));
    if (res.status === 200) return 'unlocked';
    const error = ((await res.json().catch(() => null)) as { error?: string } | null)?.error;
    if (res.status === 403) return error === 'USED_UP' ? 'usedUp' : 'wrong';
    if (res.status === 429) return 'slow';
    return 'tryAgain';
  } catch { return 'tryAgain'; }
}

export interface ReviewAccount { refresh(): Promise<BundleOwnership>; userId(): Promise<string> }
/**
 * The whole tap: redeem, then RevenueCat's fresh answer, then the same bundle download a buyer gets (the server
 * checks the grant again before it sends anything). "unlocked" only when RevenueCat itself says bundle.
 */
export async function applyReviewCode(code: string, account: ReviewAccount,
  install: (account: { restore(): Promise<BundleOwnership>; userId(): Promise<string> }) => Promise<boolean>): Promise<ReviewResult> {
  let id: string | null = null;
  try { id = await account.userId(); } catch { return 'tryAgain'; }
  const result = await redeemReviewCode(code.replace(/\D/g, ''), id);
  if (result !== 'unlocked') return result;
  try {
    const owned = await account.refresh();
    if (!owned.bundle) return 'tryAgain';
    return await install({ restore: async () => owned, userId: account.userId }) ? 'unlocked' : 'tryAgain';
  } catch { return 'tryAgain'; }
}

export const REVIEW_LINK = 'Have a review code?';
export const REVIEW_USE = 'Use this code';
export const REVIEW_SAYS: Record<ReviewResult, string> = {
  unlocked: 'The Complete Bundle is open on this phone for 7 days: both letter kits and every kit\u2019s PDF guide and Word file. Open any kit from the list above.',
  wrong: 'That code is not right. Check the 10 digits and try again.',
  usedUp: 'This review code has been used on too many phones. Contact us for a new one.',
  slow: 'Too many tries. Wait a few minutes, then try again.',
  tryAgain: 'The code could not be checked just now. Check your connection and try again.',
};
