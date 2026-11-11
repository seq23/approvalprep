import { newDispute } from './letterQuestions';
import type { SavedLetter } from './letterStorage';
export const PREVIEW_ENABLED = process.env.EXPO_PUBLIC_AP_PREVIEW === '1';
export function sampleLetters(today = new Date()): SavedLetter[] {
  const date = (offset: number) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  };
  const base = (id: string) => ({ ...newDispute(`preview-${id}`), answers: { bureau: 'equifax', account: 'Sample account · 0000', shows: 'Sample entry', happened: 'Sample facts for preview only' } });
  return [
    base('draft'),
    { ...base('sent'), status: 'sent', sentDate: date(-10), method: 'Mail' },
    { ...base('answered'), status: 'answered', sentDate: date(-35), answerNote: 'Verified', answeredAt: today.toISOString() },
  ];
}
export async function loadSamples(store: { get(id: string): Promise<SavedLetter | null>; create(letter: SavedLetter): Promise<unknown> }, enabled: boolean, today = new Date()) {
  if (!enabled) throw Error('PREVIEW_DISABLED');
  let added = 0;
  for (const letter of sampleLetters(today)) {
    if (!await store.get(letter.id)) { await store.create(letter); added++; }
  }
  return added;
}
