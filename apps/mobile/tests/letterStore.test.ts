import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLetterStore, type LetterDatabase } from '../src/letterStore';
function adapter(db: DatabaseSync): LetterDatabase {
  return {
    execAsync: async sql => { db.exec(sql); },
    runAsync: async (sql, ...values) => db.prepare(sql).run(...values),
    getAllAsync: async <T>(sql: string) => db.prepare(sql).all() as T[],
  };
}
test('letters survive closing and reopening SQLite, update without moving, and delete completely', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ap-letters-'));
  let db = new DatabaseSync(join(dir, 'letters.db'));
  try {
    let store = await createLetterStore(adapter(db));
    await store.create({ id: 'first', kind: 'bureau-dispute', answers: { item: "O'Neil; DROP TABLE letters;" } });
    await store.create({ id: 'second', kind: 'bureau-dispute' });
    await store.update('first', { status: 'sent', sentDate: '2026-11-06', method: 'mail', trackingNumber: 'fixture-123', reminderDate: '2026-12-06', answerNote: 'Awaiting answer' });
    db.close(); db = new DatabaseSync(join(dir, 'letters.db'));
    store = await createLetterStore(adapter(db));
    assert.deepEqual((await store.list()).map(l => l.id), ['first', 'second']);
    const letter = await store.get('first');
    assert.deepEqual(letter, { id: 'first', kind: 'bureau-dispute', answers: { item: "O'Neil; DROP TABLE letters;" }, status: 'sent', sentDate: '2026-11-06', method: 'mail', trackingNumber: 'fixture-123', reminderDate: '2026-12-06', answerNote: 'Awaiting answer' });
    await store.delete('first'); assert.equal(await store.get('first'), null);
    await store.deleteAll(); assert.deepEqual(await store.list(), []);
    db.close(); db = new DatabaseSync(join(dir, 'letters.db'));
    assert.deepEqual(await (await createLetterStore(adapter(db))).list(), []);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('queued updates preserve independent fields; failed writes do not block later saves', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createLetterStore(adapter(db));
    const answers = { item: 'before' };
    const create = store.create({ id: 'one', kind: 'bureau-dispute', answers });
    answers.item = 'changed outside store'; await create;
    assert.equal((await store.get('one'))?.answers.item, 'before');
    await assert.rejects(store.create({ id: 'one', kind: 'bureau-dispute' }));
    await Promise.all([store.update('one', { method: 'mail' }), store.update('one', { answerNote: 'received' })]);
    assert.equal((await store.get('one'))?.method, 'mail');
    assert.equal((await store.get('one'))?.answerNote, 'received');
    await assert.rejects(store.update('missing', { method: 'mail' }));
    assert.equal((await store.list()).length, 1);
  } finally { db.close(); }
});
test('source modules have no network transport outside purchases', () => {
  let count = 0;
  function inspect(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (/purchases|billing/.test(entry.name)) continue;
      if (entry.isDirectory()) inspect(path);
      else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        count++;
        assert.doesNotMatch(readFileSync(path, 'utf8'), /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\b(?:axios|https?)\s*\.|from\s+['"](?:axios|node:https?)/, path);
      }
    }
  }
  inspect('src'); assert.ok(count > 0);
});
