import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftWriter, newDispute, renderDispute, disputeQuestions, bureaus } from '../src/letterQuestions';
import { LETTERS } from '../src/letters';

test('free dispute renders the selected address and facts; missing facts remain blank', () => {
  const answers = { name: 'Sample Writer', address: 'Sample Street', bureau: 'experian', account: 'Sample Company 1234', shows: 'Closed account', happened: 'The account is open' };
  const result = renderDispute(answers, new Date(2026, 10, 10));
  for (const fact of Object.values(answers).filter(v => v !== 'experian' && v !== answers.shows)) assert.ok(result.text.includes(fact), fact);
  assert.ok(result.text.includes('The report shows this for the account above: closed account. This is not accurate.'), 'her entry reads as part of the sentence');
  const bureau = bureaus.find((b: { id: string }) => b.id === 'experian');
  assert.ok(bureau);
  for (const line of bureau.lines) assert.ok(result.text.includes(line));
  assert.equal(result.blanks.length, 0);
  const empty = renderDispute({}, new Date(2026, 10, 10));
  assert.ok(empty.blanks.length > 0);
  assert.match(empty.text, /\[[^\]]+\]/);
  assert.ok(!empty.text.includes('Sample Writer'));
  // Seven short questions: the ID details (date of birth, last 4 of SSN) are their own optional step.
  assert.equal(disputeQuestions.length, 7);
  const id = renderDispute({ ...answers, dob: 'January 2, 1990', ssn4: '123-45-6789' }, new Date(2026, 10, 10));
  assert.match(id.text, /Date of birth: January 2, 1990/);
  assert.match(id.text, /Last 4 digits of SSN: 6789/);
  assert.doesNotMatch(id.text, /123-45/);
  assert.equal(id.blanks.length, 0);
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

test('her answers read naturally where the letter splices them into a sentence', () => {
  const t = renderDispute({ shows: 'Shows a 60-day late payment in March 2025', enclosures: 'Bank statement\nPay stubs from Acme Corp\nBank of America statement\nChase card statement' }, new Date(2026, 10, 14)).text;
  assert.match(t, /The report shows this for the account above: a 60-day late payment in March 2025\. This is not accurate\./);
  assert.match(t, /- Copy of bank statement\n/);
  assert.match(t, /- Copy of pay stubs from Acme Corp\n/);
  assert.match(t, /- Copy of Bank of America statement\n/, 'a name keeps its capitals');
  assert.match(t, /- Copy of Chase card statement/, 'a name keeps its capitals');
  assert.doesNotMatch(t, /: Shows |Copy of Bank statement/);
  // A name at the start of the entry is left as she wrote it.
  assert.match(renderDispute({ shows: 'Capital One balance of $900' }).text, /account above: Capital One balance of \$900\./);
});
