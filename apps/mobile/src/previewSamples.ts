import { newDispute } from './letterQuestions';
import { LETTERS, EXPLANATION_LETTERS } from './letters';
import type { KitId, KitTemplates, KitKind } from './kitTemplates';
import type { SavedLetter } from './letterStorage';
export const PREVIEW_ENABLED = process.env.EXPO_PUBLIC_AP_PREVIEW === '1';
let samplesActive = false;

/** Session-only demonstration content: never saved as a purchased entitlement. */
export function previewKit(id: KitId = 'credit-letter-kit', enabled = PREVIEW_ENABLED): KitTemplates | null {
  if (!enabled || !samplesActive) return null;
  const letters = id === 'credit-letter-kit' ? LETTERS.filter(letter => letter.access === 'kit') : EXPLANATION_LETTERS;
  return { version: 1, kit: id, letters: letters.map(letter => ({
    kind: letter.kind as KitKind, name: letter.name,
    questions: [
      { title: 'Sample sender', fields: [{ name: 'sender', label: 'Sample sender name' }] },
      { title: 'Sample recipient', fields: [{ name: 'recipient', label: 'Sample recipient name' }] },
      { title: 'Sample reference', fields: [{ name: 'reference', label: 'Sample reference' }] },
      { title: 'Sample details', fields: [{ name: 'details', label: 'Sample details', multiline: true }] },
    ],
    template: 'PREVIEW SAMPLE ONLY — do not mail.\n{{today}}\nSample sender: {{sender|Sample sender}}\nSample recipient: {{recipient|Sample recipient}}\nSample reference: {{reference|Sample reference}}\nSample details: {{details|Sample details}}',
    honestLine: 'This is demonstration content, not a kit template. They may say no.',
  })) };
}

export function sampleLetters(today = new Date()): SavedLetter[] {
  const date = (offset: number) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  };
  const base = (id: string) => ({ ...newDispute(`preview-${id}`), answers: { bureau: 'equifax', account: 'Sample account · 0000', shows: 'Sample entry', happened: 'Sample facts for preview only' } });
  return [
    base('draft'),
    { ...base('sent'), status: 'sent', sentDate: date(-10), method: 'Certified mail' },
    { ...base('answered'), status: 'answered', sentDate: date(-35), answerNote: 'Verified', answeredAt: today.toISOString() },
  ];
}
export async function loadSamples(store: { get(id: string): Promise<SavedLetter | null>; create(letter: SavedLetter): Promise<unknown> }, enabled: boolean, today = new Date()) {
  if (!enabled) throw Error('PREVIEW_DISABLED');
  let added = 0;
  for (const letter of sampleLetters(today)) {
    if (!await store.get(letter.id)) { await store.create(letter); added++; }
  }
  samplesActive = true;
  return added;
}
