// The four Credit Letter Kit letters. Their wording is paid: it is never in this repo or the app
// bundle (docs/APP_PLAN.md). The purchase door saves the delivered kit on the phone; this file reads
// it back, checks every part of it, and fills a letter from her answers.
import { phoneDatabase, reportStorageFailure } from './phoneDatabase';
import type { LetterDatabase, SavedLetter } from './letterStorage';
import { previewKit } from './previewSamples';
import type { Question } from './letterQuestions';
import { EXPLANATION_LETTERS, type LetterKind } from './letters';
// @ts-ignore shared website module is JavaScript
import { formatLetterDate } from '../../../src/lib/letterStudioCore.mjs';

export type KitKind = Exclude<LetterKind, 'bureau-dispute'>;
export const KIT_KINDS: readonly KitKind[] = ['goodwill', 'debt-validation', 'settlement-terms', 'follow-up'];
export const KIT_ID = 'credit-letter-kit';
export const EXPLANATION_KIT_ID = 'letter-of-explanation-kit';
export type KitId = typeof KIT_ID | typeof EXPLANATION_KIT_ID;
export const EXPLANATION_KINDS = EXPLANATION_LETTERS.map(l => l.kind as KitKind);
export const ALL_KIT_KINDS = [...KIT_KINDS, ...EXPLANATION_KINDS];
export const kitForKind = (kind: string): KitId => EXPLANATION_KINDS.includes(kind as KitKind) ? EXPLANATION_KIT_ID : KIT_ID;
export const kindsForKit = (id: KitId) => id === KIT_ID ? KIT_KINDS : EXPLANATION_KINDS;
export const KIT_LOCKED_LINE = 'This letter is included in the Credit Letter Kit.';
export interface KitLetter { kind: KitKind; name: string; questions: Question[]; template: string; honestLine?: string; notes?: string[] }
export interface KitTemplates { version: number; kit: KitId; letters: KitLetter[] }

// Required blanks use {{field|Prompt}}; {{today}} is the date on the letter.
// {{field?|Prompt}} is an optional blank. Left unanswered it prints nothing: a line holding only
// optional blanks (and fixed words such as a label) is removed with one neighbouring empty line;
// on a line that also has required blanks, only the optional blank and the space before it go.
const TOKEN = /\{\{([A-Za-z][A-Za-z0-9]*)(\?)?(?:\|([^{}|]+))?\}\}/g;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function parseLetter(raw: unknown): KitLetter | null {
  if (!record(raw) || !ALL_KIT_KINDS.includes(raw.kind as KitKind) || !text(raw.name) || !text(raw.template)) return null;
  if (!Array.isArray(raw.questions) || raw.questions.length < 4 || raw.questions.length > 6) return null;
  const names = new Set<string>();
  const questions: Question[] = [];
  for (const q of raw.questions) {
    if (!record(q) || !text(q.title) || !Array.isArray(q.fields) || q.fields.length === 0) return null;
    const fields: Question['fields'] = [];
    for (const f of q.fields) {
      if (!record(f) || !text(f.name) || !text(f.label) || f.name === 'today' || names.has(f.name)) return null;
      if (f.multiline !== undefined && typeof f.multiline !== 'boolean') return null;
      names.add(f.name);
      fields.push({ name: f.name, label: f.label, ...(f.multiline ? { multiline: true } : {}) });
    }
    questions.push({ title: q.title, fields });
  }
  // Every blank must be one she is asked about, and every question must reach the letter.
  const used = new Set<string>();
  for (const m of raw.template.matchAll(TOKEN)) {
    if (m[1] === 'today') {
      if (m[2] || m[3]) return null;
      continue;
    }
    if (!names.has(m[1]) || !m[3]?.trim()) return null;
    used.add(m[1]);
  }
  if (used.size !== names.size || raw.template.replace(TOKEN, '').includes('{{')) return null;
  if (raw.honestLine !== undefined && !text(raw.honestLine)) return null;
  if (raw.notes !== undefined && !(Array.isArray(raw.notes) && raw.notes.every(text))) return null;
  return { kind: raw.kind as KitKind, name: raw.name, questions, template: raw.template,
    ...(raw.honestLine ? { honestLine: raw.honestLine as string } : {}), ...(raw.notes ? { notes: raw.notes as string[] } : {}) };
}

/** The whole kit or nothing: one wrong letter and the kit counts as not delivered. */
export function parseKitTemplates(raw: unknown): KitTemplates | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!record(data) || ![KIT_ID, EXPLANATION_KIT_ID].includes(data.kit as KitId) || typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) return null;
    if (!Array.isArray(data.letters) || data.letters.length === 0 || (data.kit === EXPLANATION_KIT_ID && data.letters.length !== EXPLANATION_KINDS.length)) return null;
    const letters: KitLetter[] = [];
    for (const item of data.letters) {
      const letter = parseLetter(item);
      if (!letter || !kindsForKit(data.kit as KitId).includes(letter.kind) || letters.some(l => l.kind === letter.kind)) return null;
      letters.push(letter);
    }
    return { version: data.version, kit: data.kit as KitId, letters };
  } catch { return null; }
}

export const kitLetter = (kit: KitTemplates | null, kind: string): KitLetter | null => kit?.letters.find(l => l.kind === kind) ?? null;

/** Same shape as renderDispute: the letter as text, and the blanks she still has to fill. */
export function renderKitLetter(letter: KitLetter, answers: Record<string, string>, today = new Date()): { text: string; blanks: string[] } {
  const blanks: string[] = [];
  const skipped = (m: RegExpMatchArray) => !!m[2] && !(answers[m[1]] ?? '').trim();
  const lines = letter.template.split(/\r?\n/);
  const kept: string[] = [];
  let dropBlank = false;
  lines.forEach((line, i) => {
    if (dropBlank && !line.trim()) { dropBlank = false; return; }
    dropBlank = false;
    const tokens = [...line.matchAll(TOKEN)];
    if (!tokens.some(skipped)) { kept.push(line); return; }
    if (tokens.every(m => m[2])) {
      // The whole line goes, with one of the empty lines around it, so no gap is left behind.
      const nextBlank = i + 1 >= lines.length || !lines[i + 1].trim();
      if (!nextBlank) return;
      if (kept.length && !kept[kept.length - 1].trim()) kept.pop();
      else if (!kept.length) dropBlank = true;
      return;
    }
    kept.push(line.replace(TOKEN, (all, name: string, optional: string | undefined) => optional && !(answers[name] ?? '').trim() ? '\u0000' : all)
      .replace(/[ \t]*\u0000[ \t]*/g, ' ').trim());
  });
  const template = kept.join('\n');
  const filled = template.replace(TOKEN, (_all, name: string, _optional: string | undefined, prompt: string | undefined, at: number) => {
    if (name === 'today') return formatLetterDate(today);
    let value = (answers[name] ?? '').trim();
    if (!value) {
      const bracket = prompt!.trim();
      if (!blanks.includes(bracket)) blanks.push(bracket);
      return `[${bracket}]`;
    }
    // "Acme Co." before the sentence's own full stop prints one full stop, not two.
    const after = at + _all.length;
    if (value.endsWith('.') && template[after] === '.') value = value.slice(0, -1);
    return value;
  });
  return { text: filled, blanks };
}

export function newKitDraft(id: string, kind: KitKind): SavedLetter {
  return { id, kind, answers: {}, status: 'draft', sentDate: null, method: null, trackingNumber: null, reminderDate: null, answerNote: '' };
}

/** Where the delivered kit is kept on the phone. save() refuses anything parseKitTemplates refuses. */
export async function kitStore(db: LetterDatabase, kitId: KitId = KIT_ID) {
  await db.execAsync('CREATE TABLE IF NOT EXISTS delivered_kits (kit TEXT PRIMARY KEY NOT NULL, body TEXT NOT NULL);');
  return {
    async read(): Promise<KitTemplates | null> {
      const rows = await db.getAllAsync<{ body: string }>('SELECT body FROM delivered_kits WHERE kit = ?', kitId);
      const kit = rows[0] ? parseKitTemplates(rows[0].body) : null;
      return kit?.kit === kitId ? kit : null;
    },
    async save(raw: unknown): Promise<boolean> {
      const kit = parseKitTemplates(raw);
      if (!kit || kit.kit !== kitId) return false;
      await db.runAsync('INSERT INTO delivered_kits (kit, body) VALUES (?, ?) ON CONFLICT(kit) DO UPDATE SET body = excluded.body', kitId, JSON.stringify(kit));
      return true;
    },
    async remove() { await db.runAsync('DELETE FROM delivered_kits WHERE kit = ?', kitId); },
  };
}

const opening: Partial<Record<KitId, Promise<Awaited<ReturnType<typeof kitStore>>>>> = {};
async function deliveredStore(kitId: KitId) {
  if (!opening[kitId]) opening[kitId] = phoneDatabase('approvalprep-kit.db').then(db => kitStore(db, kitId));
  try { return await opening[kitId]!; } catch (error) { delete opening[kitId]; reportStorageFailure('kits', error); throw error; }
}
/** Without a kit ID, this is the shared tracking entitlement. Letter access always passes its own ID. */
export async function loadDeliveredKit(kitId?: KitId, reportFailure = false): Promise<KitTemplates | null> {
  const sample = previewKit(kitId);
  if (sample) return sample;
  try {
    if (kitId) return await (await deliveredStore(kitId)).read();
    return await (await deliveredStore(KIT_ID)).read() || await (await deliveredStore(EXPLANATION_KIT_ID)).read();
  } catch (error) { if (reportFailure) throw error; return null; }
}
export async function saveDeliveredKit(kit: KitTemplates): Promise<boolean> {
  return (await deliveredStore(kit.kit)).save(kit);
}
export async function hasTrackingKit(): Promise<boolean> {
  return !!(await loadDeliveredKit() || await loadDeliveredKit(EXPLANATION_KIT_ID));
}
