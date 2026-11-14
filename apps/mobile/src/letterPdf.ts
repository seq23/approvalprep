import { SELF_HELP_LINE } from './copy';
import { color } from './theme';
// @ts-ignore shared free packet checklist
import { BEFORE_YOU_MAIL, buildLetter, midSentence, tidyFact } from '../../../src/lib/letterStudioCore.mjs';

export { BEFORE_YOU_MAIL };
export const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function disputedParts(text: string, entry = ''): { text: string; highlighted: boolean }[] {
  const normalized = tidyFact(entry) ? midSentence(entry) : '';
  if (!normalized) return [{ text, highlighted: false }];
  const letter = buildLetter('credit-dispute', { shows: entry });
  const paragraph = letter.paragraphs[letter.highlight];
  if (!paragraph) return [{ text, highlighted: false }];
  const paragraphStart = text.indexOf(`\n\n${paragraph}\n\n`);
  const start = paragraphStart < 0 ? -1 : paragraphStart + 2 + paragraph.indexOf(normalized);
  if (start < 0) return [{ text, highlighted: false }];
  const end = start + normalized.length;
  return [{ text: text.slice(0, start), highlighted: false }, { text: text.slice(start, end), highlighted: true }, { text: text.slice(end), highlighted: false }];
}
// The paper edge: 0.75in (54pt) on every side, Letter or A4. iOS printing ignores @page, so the
// same margin is also handed to the printer (src/letterExport.ts); the sim test printed at ~12pt.
export const PAGE_MARGIN_IN = 0.75;
export const PAGE_MARGIN_PT = PAGE_MARGIN_IN * 72;
// A plain face whose zero has no slash (the brand body face draws "2Ø26"), on screen and on paper.
export const LETTER_FONT = 'Arial, Helvetica, sans-serif';
/** "Credit bureau dispute letter – November 14, 2026.pdf": what the shared file is called. */
export function pdfFileName(title: string, today = new Date()): string {
  const date = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const name = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Your letter';
  return `${name} – ${date}.pdf`;
}
/** title names the PDF a browser saves (its <title>); the phone names the shared file the same way. */
export function letterHtml(text: string, dispute = false, title = 'Your letter'): string {
  const footer = `<footer>${escapeHtml(SELF_HELP_LINE)}</footer>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(pdfFileName(title).replace(/\.pdf$/, ''))}</title><style>
    @page { size: letter; margin: ${PAGE_MARGIN_IN}in; }
    body { color: ${color.carbon}; background: ${color.paperRaised}; font: 12pt/1.45 ${LETTER_FONT}; margin: 0; }
    article { white-space: pre-wrap; overflow-wrap: anywhere; }
    footer { font-size: 9pt; line-height: 1.4; border-top: 1px solid ${color.rule}; margin-top: 24pt; padding-top: 10pt; }
    section { break-before: page; } h1 { font-size: 20pt; } li { margin-bottom: 12pt; }
  </style></head><body><article>${escapeHtml(text)}</article>${footer}${dispute ? `<section><h1>Before you mail</h1><ul>${BEFORE_YOU_MAIL.map((line: string) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>${footer}</section>` : ''}</body></html>`;
}
export interface PdfTools {
  web: boolean;
  print(html: string): Promise<void>;
  create(html: string, fileName: string): Promise<string>;
  canShare(): Promise<boolean>;
  share(uri: string): Promise<void>;
}
export async function exportLetter(html: string, action: 'save' | 'print', tools: PdfTools, fileName = pdfFileName('Your letter')): Promise<void> {
  if (tools.web || action === 'print') return tools.print(html);
  if (!await tools.canShare()) throw new Error('Sharing is unavailable. Use Print to save a PDF instead.');
  const uri = await tools.create(html, fileName);
  if (!uri) throw new Error('The PDF could not be made. Please try again.');
  await tools.share(uri);
}
