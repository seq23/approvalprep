import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftWriter, newDispute, renderDispute, disputeQuestions, bureaus } from '../src/letterQuestions';
import { LETTERS } from '../src/letters';

test('free dispute renders the selected address and facts; missing facts remain blank', () => {
  const answers = { name: 'Sample Writer', address: 'Sample Street', bureau: 'experian', account: 'Sample Company 1234', shows: 'Closed account', happened: 'The account is open' };
  const result = renderDispute(answers, new Date(2026, 10, 10));
  for (const fact of Object.values(answers).filter(v => v !== 'experian')) assert.ok(result.text.includes(fact), fact);
  const bureau = bureaus.find((b: { id: string }) => b.id === 'experian');
  assert.ok(bureau);
  for (const line of bureau.lines) assert.ok(result.text.includes(line));
  assert.equal(result.blanks.length, 0);
  const empty = renderDispute({}, new Date(2026, 10, 10));
  assert.ok(empty.blanks.length > 0);
  assert.match(empty.text, /\[[^\]]+\]/);
  assert.ok(!empty.text.includes('Sample Writer'));
  assert.ok(disputeQuestions.length >= 4 && disputeQuestions.length <= 6);
});

test('autosave serializes rapid edits and snapshots answers before writing', async () => {
  const values: string[] = [];
  let unblock!: () => void;
  const blocked = new Promise<void>(resolve => { unblock = resolve; });
  const write = draftWriter({ create: async () => {}, update: async letter => { await blocked; values.push(letter.answers.name); } });
  const letter = newDispute('example');
  letter.answers.name = 'First'; const first = write(letter);
  letter.answers.name = 'Latest'; const second = write(letter);
  letter.answers.name = 'Unsaved';
  unblock(); await Promise.all([first, second]);
  assert.deepEqual(values, ['First', 'Latest']);
});

test('failed saves reach the caller; a retry persists the latest answers', async () => {
  let fails = true;
  const saved: string[] = [];
  const write = draftWriter({ create: async () => {}, update: async letter => { if (fails) throw Error('disk full'); saved.push(letter.answers.name); } });
  const letter = newDispute('retry');
  letter.answers.name = 'Earlier'; await assert.rejects(write(letter), /disk full/);
  fails = false; letter.answers.name = 'Latest'; await write(letter);
  assert.deepEqual(saved, ['Latest']);
});

test('the dispute stays free and the four kit letters remain locked', () => {
  assert.deepEqual(LETTERS.filter(l => l.access === 'free').map(l => l.kind), ['bureau-dispute']);
  assert.equal(LETTERS.filter(l => l.access === 'kit').length, 4);
  assert.ok(LETTERS.some(l => l.kind === 'settlement-terms'));
});
