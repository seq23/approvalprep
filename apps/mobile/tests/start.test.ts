import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startModel } from '../src/start';
import type { SavedLetter } from '../src/letterStorage';

const letter = (id: string, status: SavedLetter['status'], sentDate: string | null = null): SavedLetter => ({
  id, kind: 'bureau-dispute', answers: { bureau: `Bureau ${id}`, account: `Account ${id}` }, status, sentDate,
  method: sentDate ? 'Certified mail' : null, trackingNumber: null, reminderDate: null, answerNote: '',
});
const today = new Date(2026, 10, 13);

test('Start: no letters shows the first-letter screen only; saved letters put her next answer date and latest three first', () => {
  const empty = startModel([], false, today);
  assert.equal(empty.returning, false);
  assert.equal(empty.next, null);
  assert.deepEqual(empty.recent, []);

  // Drafts alone: she is returning, but there is no date to show.
  const drafts = startModel([letter('a', 'draft')], false, today);
  assert.equal(drafts.returning, true);
  assert.equal(drafts.next, null);
  assert.deepEqual(drafts.recent.map(row => row.letter.id), ['a']);

  const letters = [letter('a', 'sent', '2026-11-10'), letter('b', 'draft'), letter('c', 'sent', '2026-10-01'), letter('d', 'answered', '2026-09-01'), letter('e', 'draft')];
  const model = startModel(letters, true, today);
  // The earliest unanswered answer date wins; an answered letter never holds the card.
  assert.equal(model.next?.id, 'c');
  assert.match(model.next!.date, /2026/);
  assert.equal(model.next!.title, 'Bureau c · Account c');
  // Newest first, three at most.
  assert.deepEqual(model.recent.map(row => row.letter.id), ['e', 'd', 'c']);
  assert.match(model.summary, /^5 letters/);
});
