// One letter rendered the way it was (or will be) mailed, and every saved letter as one PDF (More,
// "Save all my letters as one PDF"): her letters live only on this phone, so she can keep a copy.
import type { SavedLetter } from './letterStorage';
import { renderDispute } from './letterQuestions';
import { renderKitLetter, type KitLetter } from './kitTemplates';
import { studioDraft } from './studio';
import { studioSituationOf } from './studioDrafts';
import { escapeHtml } from './letterPdf';
import { letterTitle, showDate } from './myLetters';
import { SELF_HELP_LINE } from './copy';
import { color } from './theme';

/** The day printed on the letter: the day she mailed it once it is marked sent, otherwise today. */
export function letterDay(letter: Pick<SavedLetter, 'status' | 'sentDate'>, today = new Date()): Date {
  if (letter.status !== 'draft' && letter.sentDate && /^\d{4}-\d{2}-\d{2}$/.test(letter.sentDate)) {
    const mailed = new Date(`${letter.sentDate}T12:00:00`);
    if (Number.isFinite(mailed.getTime())) return mailed;
  }
  return today;
}
/** The letter's text, or null when it is a kit letter whose kit is not on this phone. */
export function renderSavedLetter(letter: SavedLetter, kit: KitLetter | null, today = new Date()): { text: string; blanks: string[] } | null {
  const day = letterDay(letter, today);
  const studio = studioSituationOf(letter.kind);
  if (studio) { try { return { text: studioDraft(studio, letter.answers, day).text, blanks: [] }; } catch { return null; } }
  if (letter.kind === 'bureau-dispute') return renderDispute(letter.answers, day);
  return kit && kit.kind === letter.kind ? renderKitLetter(kit, letter.answers, day) : null;
}
export function allLettersHtml(letters: SavedLetter[], kitFor: (kind: string) => KitLetter | null, today = new Date()): string {
  const parts = letters.map(letter => {
    const rendered = renderSavedLetter(letter, kitFor(letter.kind), today);
    const status = letter.status === 'draft' ? 'Draft, not mailed' : letter.sentDate ? `Mailed ${showDate(new Date(`${letter.sentDate}T12:00:00`))}${letter.method ? ` by ${letter.method.toLowerCase()}` : ''}${letter.trackingNumber ? `, tracking ${letter.trackingNumber}` : ''}` : 'Marked as sent';
    const answer = letter.answerNote ? ` · Answer recorded: ${letter.answerNote}` : '';
    return `<section><h2>${escapeHtml(letterTitle(letter))}</h2><p class="meta">${escapeHtml(status + answer)}</p>`
      + `<article>${escapeHtml(rendered?.text ?? 'This kit letter needs its kit on this phone to print. Restore your purchase on More, then save again.')}</article></section>`;
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>My ApprovalPrep letters</title><style>
    @page { size: letter; margin: 0.65in; }
    body { color: ${color.carbon}; background: ${color.paperRaised}; font: 12pt/1.45 Arial, sans-serif; margin: 0; }
    section + section { break-before: page; } h1 { font-size: 20pt; } h2 { font-size: 14pt; margin: 0 0 4pt; }
    .meta { font-size: 10pt; margin: 0 0 12pt; } article { white-space: pre-wrap; overflow-wrap: anywhere; }
    footer { font-size: 9pt; border-top: 1px solid ${color.rule}; margin-top: 24pt; padding-top: 10pt; }
  </style></head><body><h1>My ApprovalPrep letters</h1><p class="meta">${escapeHtml(`${letters.length} ${letters.length === 1 ? 'letter' : 'letters'}, saved ${showDate(today)}`)}</p>${parts.join('')}<footer>${escapeHtml(SELF_HELP_LINE)}</footer></body></html>`;
}
/** Builds the PDF of every saved letter and opens Save / Share (Print in the browser). Returns how many letters went in. */
export async function exportAllLetters(): Promise<number> {
  const [{ savedLetters }, { loadDeliveredKit, kitLetter, kitForKind, ALL_KIT_KINDS, KIT_ID, EXPLANATION_KIT_ID }, { saveOrPrintLetter }] = await Promise.all([import('./savedLetters'), import('./kitTemplates'), import('./letterExport')]);
  const letters = await (await savedLetters()).list();
  if (!letters.length) return 0;
  const kits = { [KIT_ID]: await loadDeliveredKit(KIT_ID), [EXPLANATION_KIT_ID]: await loadDeliveredKit(EXPLANATION_KIT_ID) };
  await saveOrPrintLetter(allLettersHtml(letters, kind => ALL_KIT_KINDS.includes(kind as never) ? kitLetter(kits[kitForKind(kind)], kind) : null), 'save');
  return letters.length;
}
