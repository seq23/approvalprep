import type { SavedLetter } from './letterStorage';
// One renderer and one address list for the website and phone.
// @ts-ignore shared website module is JavaScript
import { buildLetter, bureaus } from '../../../src/lib/letterStudioCore.mjs';
export { bureaus };
export interface Question { title: string; fields: { name: string; label: string; multiline?: boolean }[] }
export const disputeQuestions: Question[] = [
  { title: 'Who is sending this letter?', fields: [{ name: 'name', label: 'Your full name' }, { name: 'address', label: 'Your mailing address', multiline: true }] },
  { title: 'Which bureau shows the error?', fields: [] },
  { title: 'Which account is wrong?', fields: [{ name: 'account', label: 'Company name and last four account digits' }] },
  { title: 'What does your report say?', fields: [{ name: 'shows', label: 'The entry you believe is wrong', multiline: true }] },
  { title: 'Why is that wrong?', fields: [{ name: 'happened', label: 'The true facts, in your own words', multiline: true }] },
  { title: 'What proof are you enclosing?', fields: [{ name: 'enclosures', label: 'Copies, never originals (optional)', multiline: true }] },
];
export function newDispute(id: string): SavedLetter {
  return { id, kind: 'bureau-dispute', answers: {}, status: 'draft', sentDate: null, method: null, trackingNumber: null, reminderDate: null, answerNote: '' };
}
export function renderDispute(answers: Record<string, string>, today = new Date()): { text: string; blanks: string[] } {
  return buildLetter('credit-dispute', answers, { today });
}
/** `saved: false` is a letter just opened: nothing is stored until its first write, so My letters never fills with blank drafts. */
export function draftWriter(store: { update(letter: SavedLetter): Promise<void>; create(letter: SavedLetter): Promise<unknown> }, saved = true) {
  let pending = Promise.resolve();
  return (letter: SavedLetter) => {
    const snapshot = { ...letter, answers: { ...letter.answers } };
    pending = pending.catch(() => {}).then(async () => {
      if (saved) return store.update(snapshot);
      await store.create(snapshot); saved = true;
    });
    return pending;
  };
}
