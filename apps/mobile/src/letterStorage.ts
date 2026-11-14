export interface SavedLetter {
  id: string;
  kind: string;
  answers: Record<string, string>;
  status: 'draft' | 'sent' | 'answered';
  sentDate: string | null;
  method: string | null;
  trackingNumber: string | null;
  reminderDate: string | null;
  answerNote: string;
  answeredAt?: string;
}
export interface LetterDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
}
// Only the last 4 digits of a Social Security number are ever kept on the phone (the sim test
// typed 6 digits and all 6 were stored). Applied on every write and every read, and on open any
// longer value saved before this rule is cut down where it sits.
export const SSN_FIELD = 'ssn4';
export function lastFourOnly(answers: Record<string, string>): Record<string, string> {
  if (!(SSN_FIELD in answers)) return answers;
  const digits = String(answers[SSN_FIELD] ?? '').replace(/\D/g, '');
  return { ...answers, [SSN_FIELD]: digits.slice(-4) };
}
/** What the SSN box shows after a keystroke: digits only, at most 4. A paste of a longer number keeps its last 4; a 5th typed digit is ignored. */
export function ssnInput(next: string, previous: string): string {
  const digits = next.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return digits.length - previous.replace(/\D/g, '').length > 1 ? digits.slice(-4) : previous.replace(/\D/g, '').slice(0, 4);
}
const COLUMNS = 'id, kind, answers, status, sentDate, method, trackingNumber, reminderDate, answerNote, answeredAt';
type StoredLetter = Omit<SavedLetter, 'answers'> & { answers: string };
function decode(row: StoredLetter): SavedLetter { const { answeredAt, ...rest } = row; return { ...rest, answers: lastFourOnly(JSON.parse(row.answers)), ...(answeredAt ? { answeredAt } : {}) }; }
function values(letter: SavedLetter) {
  if (!letter.id.trim() || !letter.kind.trim() || !['draft', 'sent', 'answered'].includes(letter.status) || !Object.values(letter.answers).every(value => typeof value === 'string')) throw Error('INVALID_LETTER');
  return [letter.id, letter.kind, JSON.stringify(lastFourOnly(letter.answers)), letter.status, letter.sentDate, letter.method, letter.trackingNumber, letter.reminderDate, letter.answerNote, letter.answeredAt ?? null];
}

export async function letterStorage(db: LetterDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, answers TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'sent', 'answered')),
    sentDate TEXT, method TEXT, trackingNumber TEXT, reminderDate TEXT, answerNote TEXT NOT NULL
  );`);
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(letters)');
  if (!columns.some(column => column.name === 'answeredAt')) await db.execAsync('ALTER TABLE letters ADD COLUMN answeredAt TEXT');
  // A longer SSN saved before the 4-digit rule is cut down on the phone itself, not only on screen.
  for (const row of await db.getAllAsync<{ id: string; answers: string }>('SELECT id, answers FROM letters')) {
    let answers: Record<string, string>;
    try { answers = JSON.parse(row.answers); } catch { continue; }
    const trimmed = lastFourOnly(answers);
    if (trimmed[SSN_FIELD] !== answers[SSN_FIELD]) await db.runAsync('UPDATE letters SET answers = ? WHERE id = ?', JSON.stringify(trimmed), row.id);
  }
  return {
    async create(letter: SavedLetter) {
      await db.runAsync(`INSERT INTO letters (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ...values(letter));
      return letter;
    },
    async get(id: string) {
      const rows = await db.getAllAsync<StoredLetter>(`SELECT ${COLUMNS} FROM letters WHERE id = ?`, id);
      return rows[0] ? decode(rows[0]) : null;
    },
    async list() {
      const rows = await db.getAllAsync<StoredLetter>(`SELECT ${COLUMNS} FROM letters ORDER BY rowid`);
      return rows.map(decode);
    },
    async update(letter: SavedLetter) {
      const data = values(letter);
      await db.runAsync('UPDATE letters SET kind = ?, answers = ?, status = ?, sentDate = ?, method = ?, trackingNumber = ?, reminderDate = ?, answerNote = ?, answeredAt = ? WHERE id = ?', ...data.slice(1), letter.id);
    },
    async remove(id: string) { await db.runAsync('DELETE FROM letters WHERE id = ?', id); },
    async removeAll() { await db.runAsync('DELETE FROM letters'); },
  };
}
