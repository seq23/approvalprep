// Parameterized SQLite storage shared by the native adapter and real-SQLite tests.
export interface Letter {
  id: string;
  kind: string;
  answers: Record<string, string>;
  status: 'draft' | 'sent' | 'answered';
  sentDate: string | null;
  method: string | null;
  trackingNumber: string | null;
  reminderDate: string | null;
  answerNote: string | null;
}
export interface LetterDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...values: (string | null)[]): Promise<unknown>;
  getAllAsync<T>(sql: string): Promise<T[]>;
}
const schema = `CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  answers TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'sent', 'answered')),
  sentDate TEXT, method TEXT, trackingNumber TEXT, reminderDate TEXT, answerNote TEXT
);`;
type StoredLetter = Omit<Letter, 'answers'> & { answers: string };
function validate(letter: Letter) {
  if (!letter.id || !letter.kind) throw new Error('Letter id and kind are required.');
  if (!['draft', 'sent', 'answered'].includes(letter.status)) throw new Error('Invalid letter status.');
  if (!letter.answers || Array.isArray(letter.answers) || Object.values(letter.answers).some(v => typeof v !== 'string')) {
    throw new Error('Letter answers must be text.');
  }
}
export async function createLetterStore(db: LetterDatabase) {
  await db.execAsync(schema);
  // Serializes read-modify-write updates, including rapid autosave and delete.
  let pending: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }
  async function rows(): Promise<Letter[]> {
    return (await db.getAllAsync<StoredLetter>('SELECT * FROM letters ORDER BY rowid')).map(row => ({ ...row, answers: JSON.parse(row.answers) }));
  }
  const values = (letter: Letter) => [letter.kind, JSON.stringify(letter.answers), letter.status,
    letter.sentDate, letter.method, letter.trackingNumber, letter.reminderDate, letter.answerNote, letter.id];
  return {
    list: () => enqueue(rows),
    get: (id: string) => enqueue(async () => (await rows()).find(letter => letter.id === id) ?? null),
    create: (input: Pick<Letter, 'id' | 'kind'> & Partial<Omit<Letter, 'id' | 'kind'>>) => {
      const letter: Letter = { answers: {}, status: 'draft', sentDate: null, method: null,
        trackingNumber: null, reminderDate: null, answerNote: null, ...input };
      validate(letter);
      // Snapshot before the queued write; callers cannot mutate a pending autosave.
      const params = values(letter);
      return enqueue(async () => {
        await db.runAsync('INSERT INTO letters (kind, answers, status, sentDate, method, trackingNumber, reminderDate, answerNote, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ...params);
        return { ...letter, answers: JSON.parse(params[1]!) as Record<string, string> };
      });
    },
    update: (id: string, patch: Partial<Omit<Letter, 'id'>>) => {
      const snapshot = JSON.parse(JSON.stringify(patch)) as typeof patch;
      return enqueue(async () => {
        const existing = (await rows()).find(letter => letter.id === id);
        if (!existing) throw new Error('Letter not found.');
        const letter: Letter = { ...existing, ...snapshot, id };
        validate(letter);
        await db.runAsync('UPDATE letters SET kind=?, answers=?, status=?, sentDate=?, method=?, trackingNumber=?, reminderDate=?, answerNote=? WHERE id=?', ...values(letter));
        return letter;
      });
    },
    delete: (id: string) => enqueue(async () => { await db.runAsync('DELETE FROM letters WHERE id=?', id); }),
    deleteAll: () => enqueue(async () => { await db.runAsync('DELETE FROM letters'); }),
  };
}
export type LetterStore = Awaited<ReturnType<typeof createLetterStore>>;
