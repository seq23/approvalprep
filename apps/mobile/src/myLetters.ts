import type { SavedLetter } from './letterStorage';
import { LETTERS, EXPLANATION_LETTERS } from './letters';
// @ts-ignore shared phone/website date calculation
import { answerDueDate } from '../../../src/lib/letterStudioCore.mjs';
export const ANSWERS = ['Corrected', 'Verified', 'No answer', 'Other answer'] as const;
export type Answer = typeof ANSWERS[number];
const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
export function dueDate(letter: SavedLetter): Date | null {
  if (!letter.sentDate || !/^\d{4}-\d{2}-\d{2}$/.test(letter.sentDate)) return null;
  const date = new Date(`${letter.sentDate}T12:00:00`);
  return Number.isFinite(date.getTime()) ? answerDueDate(date) : null;
}
export const showDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export function myLetters(letters: SavedLetter[], hasKit: boolean, today = new Date()) {
  const rows = letters.map(letter => {
    const due = dueDate(letter);
    const days = due ? dayNumber(due) - dayNumber(today) : null;
    const needsAnswer = hasKit && letter.status === 'sent' && days !== null && days <= 0;
    let sub = 'Draft · Continue writing';
    if (letter.status === 'sent') {
      sub = letter.sentDate ? `Sent · ${showDate(new Date(`${letter.sentDate}T12:00:00`))}` : 'Sent · Mailing date not entered';
      if (due) sub += hasKit
        ? ` · ${days! > 0 ? `Answer due in ${days} days` : days === 0 ? 'Answer due today' : `${-days!} days past the reminder date`}`
        : ` · Answer date ${showDate(due)}`;
    }
    if (letter.status === 'answered') {
      const stamp = letter.answeredAt ? new Date(letter.answeredAt) : null;
      sub = `✓ Answered${stamp && Number.isFinite(stamp.getTime()) ? ` · ${showDate(stamp)}, ${stamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}`;
    }
    return { letter, title: [letter.answers.bureau, letter.answers.account || [...LETTERS, ...EXPLANATION_LETTERS].find(item => item.kind === letter.kind)?.name || 'Saved letter'].filter(Boolean).join(' · '), sub, needsAnswer };
  });
  const count = rows.filter(row => row.needsAnswer).length;
  return { rows, summary: `${letters.length} ${letters.length === 1 ? 'letter' : 'letters'}${hasKit ? ` · ${count} ${count === 1 ? 'answer' : 'answers'} to check` : ''}` };
}
export function recordAnswer(letter: SavedLetter, answer: Answer, hasKit: boolean, now = new Date()): SavedLetter {
  if (!hasKit || letter.status !== 'sent' || !ANSWERS.includes(answer)) throw Error('ANSWER_RECORDING_UNAVAILABLE');
  return { ...letter, status: 'answered', answerNote: answer, answeredAt: now.toISOString() };
}
