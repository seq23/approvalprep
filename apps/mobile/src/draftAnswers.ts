// "Your answers" under a draft (finding #18): each question with what she wrote, so one fact is
// changed by tapping its question, never by stepping through all of them again.
import type { SavedLetter } from './letterStorage';
// @ts-ignore shared website module is JavaScript
import { bureaus } from '../../../src/lib/letterStudioCore.mjs';
export function answerRows(questions: { title: string; fields: { name: string; label?: string }[] }[], answers: Record<string, string>) {
  return questions.map(q => {
    const names = q.fields.length ? q.fields.map(f => f.name) : ['bureau'];
    const said = names.map(name => name === 'bureau' ? (bureaus as { id: string; name: string }[]).find(b => b.id === answers.bureau)?.name ?? '' : (answers[name] ?? '').trim()).filter(Boolean);
    return { title: q.title, sub: said.length ? said.join(' · ').replace(/\s+/g, ' ').slice(0, 120) : 'Not answered yet' };
  });
}
/** A fresh draft with the same answers (plus any change), never the mailing details of the original. */
export function copyOf(letter: SavedLetter, changes: Record<string, string> = {}, id = `letter-${Date.now()}-${Math.random().toString(36).slice(2)}`): SavedLetter {
  return { id, kind: letter.kind, answers: { ...letter.answers, ...changes }, status: 'draft', sentDate: null, method: null, trackingNumber: null, reminderDate: null, answerNote: '' };
}
