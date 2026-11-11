import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { loadSamples, sampleLetters } from '../src/previewSamples';
import { newDispute } from '../src/letterQuestions';
import type { SavedLetter } from '../src/letterStorage';

test('preview seeding refuses release, preserves existing drafts, and stays idempotent', async () => {
  const own = newDispute('my-real-draft');
  const rows = new Map<string, SavedLetter>([[own.id, own]]);
  const store = { get: async (id: string) => rows.get(id) ?? null, create: async (letter: SavedLetter) => { rows.set(letter.id, letter); } };
  await assert.rejects(loadSamples(store, false), /PREVIEW_DISABLED/);
  assert.equal(rows.size, 1);
  assert.equal(await loadSamples(store, true), 3);
  const edited = { ...rows.get('preview-draft')!, answers: { account: 'Edited sample' } };
  rows.set(edited.id, edited);
  assert.equal(await loadSamples(store, true), 0);
  assert.equal(rows.size, 4);
  assert.deepEqual(rows.get(edited.id), edited);
  assert.deepEqual(rows.get(own.id), own);
  assert.deepEqual(sampleLetters().map(letter => letter.status), ['draft', 'sent', 'answered']);
});
test('production config and release command reject the preview flag', () => {
  for (const flag of ['1', '0', '']) {
    const env = { ...process.env, EXPO_PUBLIC_AP_PREVIEW: flag, EAS_BUILD_PROFILE: 'production' };
    const command = spawnSync(process.execPath, ['scripts/release-gate.mjs'], { env, encoding: 'utf8' });
    const config = spawnSync(process.execPath, ['--import', 'tsx', '-e', "import('./app.config.ts')"], { env, encoding: 'utf8' });
    for (const result of [command, config]) {
      assert.equal(result.status, flag === '1' ? 1 : 0, result.stderr);
      if (flag === '1') assert.match(result.stderr, /PREVIEW_FLAG_SET/);
    }
  }
});
