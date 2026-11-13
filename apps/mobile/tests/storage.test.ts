import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { letterStorage, type SavedLetter } from '../src/letterStorage';

const draft = (id: string): SavedLetter => ({ id, kind: 'bureau-dispute', answers: { description: "A quoted ' value; DROP TABLE letters;" }, status: 'draft', sentDate: null, method: null, trackingNumber: null, reminderDate: null, answerNote: '' });
function driver(db: DatabaseSync) {
  return {
    execAsync: async (sql: string) => { db.exec(sql); },
    runAsync: async (sql: string, ...params: (string | number | null)[]) => db.prepare(sql).run(...params),
    getAllAsync: async <T>(sql: string, ...params: (string | number | null)[]) => db.prepare(sql).all(...params) as T[],
  };
}
test('CRUD uses real SQLite; restart keeps every field and updates preserve list order', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ap-storage-'));
  const file = join(dir, 'letters.db');
  let db = new DatabaseSync(file);
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  let store = await letterStorage(driver(db));
  await store.create(draft('one'));
  await store.create(draft('two'));
  await assert.rejects(store.create(draft('one')));
  const sent: SavedLetter = { ...draft('one'), status: 'answered', sentDate: '2026-11-06', method: 'Certified mail', trackingNumber: '123', reminderDate: '2026-12-06', answerNote: 'Answered', answeredAt: '2026-12-06T12:00:00.000Z' };
  await store.update(sent);
  db.close();
  db = new DatabaseSync(file);
  store = await letterStorage(driver(db));
  assert.deepEqual(await store.get('one'), sent);
  assert.deepEqual((await store.list()).map(l => l.id), ['one', 'two']);
  await store.remove('one');
  assert.equal(await store.get('one'), null);
  assert.equal((await store.list()).length, 1);
  await store.removeAll();
  assert.deepEqual(await store.list(), []);
  await assert.rejects(store.create({ ...draft('bad'), status: 'invalid' as 'draft' }));
  assert.deepEqual(await store.list(), []);
});
test('phone source cannot call the network outside purchases', () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  const files = walk(join(__dirname, '../src')).filter(f => /\.tsx?$/.test(f) && !/\/purchases\//.test(f));
  assert.ok(files.length > 0);
  for (const file of files) assert.doesNotMatch(readFileSync(file, 'utf8'), /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\b(?:axios|https?|net)\s*\./, file);
});
