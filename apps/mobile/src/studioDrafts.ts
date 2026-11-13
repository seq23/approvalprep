// Letter Studio drafts are kept in the same on-phone store as every other letter, so what she
// types survives Back, a tab change and a reload, and shows in My letters as a draft
// (hostile review, 13 Nov 2026: answers were wiped with no warning and could not be saved).
import type { SavedLetter } from './letterStorage';
const PREFIX = 'studio-';
export const studioKind = (situation: string) => `${PREFIX}${situation}`;
export const studioSituationOf = (kind: string) => kind.startsWith(PREFIX) ? kind.slice(PREFIX.length) : null;
export const newStudioId = () => `studio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function newStudioDraft(id: string, situation: string): SavedLetter {
  return { id, kind: studioKind(situation), answers: {}, status: 'draft', sentDate: null, method: null, trackingNumber: null, reminderDate: null, answerNote: '' };
}
/** The draft she last worked on for this situation, so choosing it again picks up where she stopped. */
export async function latestStudioDraft(store: { list(): Promise<SavedLetter[]> }, situation: string): Promise<SavedLetter | null> {
  const mine = (await store.list()).filter(letter => letter.kind === studioKind(situation) && letter.status === 'draft');
  return mine.at(-1) ?? null;
}
/** The question an address asks for, kept inside the situation's own list. */
export function studioStep(param: string | string[] | undefined, questions: number): number {
  const asked = Number(Array.isArray(param) ? param[0] : param);
  return Number.isInteger(asked) && asked >= 0 && questions > 0 ? Math.min(asked, questions - 1) : 0;
}
/** Where a saved draft opens: a Studio draft in the Studio, any other letter in its questions. */
export function draftHref(letter: Pick<SavedLetter, 'id' | 'kind'>, from: string) {
  const situation = studioSituationOf(letter.kind);
  return situation
    ? { pathname: '/letters/studio' as const, params: { situation, id: letter.id, step: '0', from } }
    : { pathname: '/letters/[kind]' as const, params: { kind: letter.kind, id: letter.id, from } };
}
