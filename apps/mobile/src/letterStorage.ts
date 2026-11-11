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
const COLUMNS = 'id, kind, answers, status, sentDate, method, trackingNumber, reminderDate, answerNote, answeredAt';
type StoredLetter = Omit<SavedLetter, 'answers'> & { answers: string };
function decode(row: StoredLetter): SavedLetter { const { answeredAt, ...rest } = row; return { ...rest, answers: JSON.parse(row.answers), ...(answeredAt ? { answeredAt } : {}) }; }
function values(letter: SavedLetter) {
  if (!letter.id.trim() || !letter.kind.trim() || !['draft', 'sent', 'answered'].includes(letter.status) || !Object.values(letter.answers).every(value => typeof value === 'string')) throw Error('INVALID_LETTER');
  return [letter.id, letter.kind, JSON.stringify(letter.answers), letter.status, letter.sentDate, letter.method, letter.trackingNumber, letter.reminderDate, letter.answerNote, letter.answeredAt ?? null];
}

export async function letterStorage(db: LetterDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, answers TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'sent', 'answered')),
    sentDate TEXT, method TEXT, trackingNumber TEXT, reminderDate TEXT, answerNote TEXT NOT NULL
  );`);
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(letters)');
  if (!columns.some(column => column.name === 'answeredAt')) await db.execAsync('ALTER TABLE letters ADD COLUMN answeredAt TEXT');
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
