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
  return latestDraft(store, studioKind(situation));
}
/** The unfinished letter of this kind she worked on last, so opening it again never piles up duplicates. */
export async function latestDraft(store: { list(): Promise<SavedLetter[]> }, kind: string): Promise<SavedLetter | null> {
  return (await store.list()).filter(letter => letter.kind === kind && letter.status === 'draft').at(-1) ?? null;
}
/** Where choosing a Studio situation (or an event's link that names only the situation) opens:
 * her latest unfinished draft of it, or a new one, at the first question. */
export async function studioEntry(store: { list(): Promise<SavedLetter[]> } | null, situation: string, fresh = false) {
  let last: SavedLetter | null = null;
  try { last = fresh || !store ? null : await latestStudioDraft(store, situation); } catch { /* A new draft is still possible. */ }
  return { pathname: '/letters/studio' as const, params: { situation, id: last?.id ?? newStudioId(), step: '0', ...(last ? { resumed: '1' } : {}) } };
}
/** Where "write this letter" opens: her latest unfinished one of that kind, or a new one. */
export async function letterHref(store: { list(): Promise<SavedLetter[]> }, kind: string, from?: string) {
  const last = await latestDraft(store, kind).catch(() => null);
  return { pathname: '/letters/[kind]' as const, params: { kind, ...(last ? { id: last.id, resumed: '1' } : {}), ...(from ? { from } : {}) } };
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
