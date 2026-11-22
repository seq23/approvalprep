// The one store rating ask (launch kit, 21 Nov 2026): trigger, caps and failure paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { askForRatingAfterMailing, FIRST_DAY_MS, ratingState } from '../src/ratingPrompt';

function driver(db: DatabaseSync) {
  return {
    execAsync: async (sql: string) => { db.exec(sql); },
    runAsync: async (sql: string, ...params: (string | number | null)[]) => db.prepare(sql).run(...params),
    getAllAsync: async <T>(sql: string, ...params: (string | number | null)[]) => db.prepare(sql).all(...params) as T[],
  };
}
function sheet(available = true, fails = false) {
  const calls: string[] = [];
  return { calls, isAvailableAsync: async () => available, requestReview: async () => { calls.push('review'); if (fails) throw Error('sheet broke'); } };
}
const day0 = new Date('2026-11-21T12:00:00Z');
const later = (ms: number) => new Date(day0.getTime() + ms);

test('never in the first day after first open, then exactly once per install, kept across restarts', async () => {
  const db = new DatabaseSync(':memory:');
  let state = await ratingState(driver(db));
  await state.firstOpenedAt(day0);
  const s = sheet();
  assert.equal(await askForRatingAfterMailing({ state, sheet: s }, later(FIRST_DAY_MS - 1)), 'first-day');
  assert.deepEqual(s.calls, []);
  assert.equal(await askForRatingAfterMailing({ state, sheet: s }, later(FIRST_DAY_MS)), 'asked');
  state = await ratingState(driver(db)); // app restart: the same file
  assert.equal(await askForRatingAfterMailing({ state, sheet: s }, later(40 * FIRST_DAY_MS)), 'already-asked');
  assert.deepEqual(s.calls, ['review']);
});

test('the first open is recorded once; a later open never moves it', async () => {
  const state = await ratingState(driver(new DatabaseSync(':memory:')));
  assert.equal((await state.firstOpenedAt(day0)).toISOString(), day0.toISOString());
  assert.equal((await state.firstOpenedAt(later(5 * FIRST_DAY_MS))).toISOString(), day0.toISOString());
});

test('the first save on a fresh install counts as day one, not as a reason to ask', async () => {
  const state = await ratingState(driver(new DatabaseSync(':memory:')));
  const s = sheet();
  assert.equal(await askForRatingAfterMailing({ state, sheet: s }, day0), 'first-day');
  assert.deepEqual(s.calls, []);
});

test('no platform sheet (web, sideload): nothing shown and the one ask is not used up', async () => {
  const state = await ratingState(driver(new DatabaseSync(':memory:')));
  await state.firstOpenedAt(day0);
  assert.equal(await askForRatingAfterMailing({ state, sheet: sheet(false) }, later(2 * FIRST_DAY_MS)), 'unavailable');
  assert.equal(await state.asked(), false);
});

test('a broken sheet or broken storage never throws into the save, and never asks twice', async () => {
  const state = await ratingState(driver(new DatabaseSync(':memory:')));
  await state.firstOpenedAt(day0);
  const s = sheet(true, true);
  assert.equal(await askForRatingAfterMailing({ state, sheet: s }, later(2 * FIRST_DAY_MS)), 'failed');
  assert.equal(await askForRatingAfterMailing({ state, sheet: s }, later(3 * FIRST_DAY_MS)), 'already-asked');
  assert.deepEqual(s.calls, ['review']);
  const broken = { firstOpenedAt: async () => { throw Error('disk'); }, asked: async () => false, markAsked: async () => {} };
  assert.equal(await askForRatingAfterMailing({ state: broken, sheet: sheet() }, later(2 * FIRST_DAY_MS)), 'failed');
});

test('wired after a successful mailing save only, with no "are you happy?" gate anywhere', () => {
  const screen = readFileSync(new URL('../app/(tabs)/letters/sent.tsx', import.meta.url), 'utf8');
  const save = screen.slice(screen.indexOf('async function save()'), screen.indexOf('return <Screen'));
  const ask = save.indexOf('askForRatingAfterSave()');
  assert.ok(ask > save.indexOf('setLetter(result.letter)') && ask < save.indexOf('} catch'), 'the ask follows the saved result, inside the success path');
  const wiredFiles = ['src/askForRating.ts', 'src/ratingPrompt.ts', 'app/(tabs)/letters/sent.tsx'].map(f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(wiredFiles, /enjoy(ing)? (the )?app|are you happy|rate us 5|5 stars/i);
});
