// Hostile review, 13 Nov 2026: Letter Studio answers were wiped by Back, by a tab change and by a
// reload, and a draft could not be saved. They now live in the same store as every other letter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SavedLetter } from '../src/letterStorage';
import { draftWriter } from '../src/letterQuestions';
import { draftHref, latestStudioDraft, newStudioDraft, studioKind, studioSituationOf, studioStep } from '../src/studioDrafts';
import { myLetters } from '../src/myLetters';
import { situations } from '../src/studio';
import { isCreditLetter } from '../src/letters';

function phone() {
  const rows = new Map<string, SavedLetter>();
  const copy = (letter: SavedLetter) => ({ ...letter, answers: { ...letter.answers } });
  return {
    rows,
    async create(letter: SavedLetter) { if (rows.has(letter.id)) throw Error('EXISTS'); rows.set(letter.id, copy(letter)); },
    async update(letter: SavedLetter) { if (!rows.has(letter.id)) throw Error('MISSING'); rows.set(letter.id, copy(letter)); },
    async get(id: string) { const found = rows.get(id); return found ? copy(found) : null; },
    async list() { return [...rows.values()].map(copy); },
  };
}

test('Studio answers are kept across Back, a tab change and a reload, and the draft is in My letters', async () => {
  const store = phone();
  const rental = situations.find(s => s.id === 'rental')!;
  const first = rental.fields[0].name, second = rental.fields[1].name;

  // Opening a situation stores nothing: My letters never fills with blank drafts.
  let screen = newStudioDraft('studio-1', 'rental');
  let write = draftWriter(store, false);
  assert.equal((await store.list()).length, 0);

  // She answers question 1, then question 2 on the next step.
  screen = { ...screen, answers: { ...screen.answers, [first]: 'Ada Lovelace' } };
  await write(screen);
  screen = { ...screen, answers: { ...screen.answers, [second]: 'A second answer' } };
  await write(screen);

  // Back, a tab change or a reload throws the screen away. A new one reads the phone.
  const reopened = await store.get('studio-1');
  assert.deepEqual(reopened?.answers, { [first]: 'Ada Lovelace', [second]: 'A second answer' });

  // Choosing the same situation again from the Studio list picks the same draft up.
  const resumed = await latestStudioDraft(store, 'rental');
  assert.equal(resumed?.id, 'studio-1');
  assert.equal(await latestStudioDraft(store, 'loan'), null);

  // A question she returns to writes on top of what the phone holds, never over it.
  write = draftWriter(store, true);
  await write({ ...reopened!, answers: { ...reopened!.answers, [first]: 'Ada King' } });
  assert.deepEqual((await store.get('studio-1'))?.answers, { [first]: 'Ada King', [second]: 'A second answer' });

  // It is listed in My letters as a draft under the situation's own name, and opens back in the Studio.
  const row = myLetters(await store.list(), false).rows[0];
  assert.equal(row.title, `${rental.label} · Letter Studio draft`);
  assert.match(row.sub, /^Draft/);
  assert.deepEqual(draftHref(row.letter, '/mine'), { pathname: '/letters/studio', params: { situation: 'rental', id: 'studio-1', step: '0', from: '/mine' } });
  assert.deepEqual(draftHref({ id: 'd', kind: 'bureau-dispute' }, '/mine'), { pathname: '/letters/[kind]', params: { kind: 'bureau-dispute', id: 'd', from: '/mine' } });
});

test('a Studio step in the address stays inside the situation, so Back and reload land on a real question', () => {
  assert.equal(studioStep('2', 5), 2);
  assert.equal(studioStep('9', 5), 4);
  assert.equal(studioStep('-1', 5), 0);
  assert.equal(studioStep('abc', 5), 0);
  assert.equal(studioStep(undefined, 5), 0);
  assert.equal(studioStep(['1'], 5), 1);
  for (const s of situations) assert.equal(studioSituationOf(studioKind(s.id)), s.id);
  assert.equal(studioSituationOf('bureau-dispute'), null);
});

// The credit-report caution belongs on credit letters only (it used to show on rental and business letters).
test('the credit-report caution is for credit letters only', () => {
  for (const kind of ['bureau-dispute', 'goodwill', 'debt-validation', 'settlement-terms', 'follow-up', studioKind('credit'), studioKind('credit-dispute')]) assert.ok(isCreditLetter(kind), kind);
  for (const kind of [studioKind('rental'), studioKind('business'), studioKind('income'), 'explanation-rental-issue', 'explanation-employment-gap']) assert.ok(!isCreditLetter(kind), kind);
});
