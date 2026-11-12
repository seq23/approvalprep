import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { loadSamples, sampleLetters, previewKit } from '../src/previewSamples';
import { newDispute } from '../src/letterQuestions';
import { KIT_ID, EXPLANATION_KIT_ID, parseKitTemplates, renderKitLetter } from '../src/kitTemplates';
import { MAIL_METHODS } from '../src/sentLetter';
import type { SavedLetter } from '../src/letterStorage';

test('preview seeding refuses release, preserves existing drafts, and stays idempotent', async () => {
  const own = newDispute('my-real-draft');
  const rows = new Map<string, SavedLetter>([[own.id, own]]);
  const store = { get: async (id: string) => rows.get(id) ?? null, create: async (letter: SavedLetter) => { rows.set(letter.id, letter); } };
  assert.equal(previewKit(KIT_ID, true), null);
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
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /BUNDLE_ID_PLACEHOLDER/);
      assert.match(result.stderr, /REVENUECAT_KEY_MISSING/);
      if (flag === '1') assert.match(result.stderr, /PREVIEW_FLAG_SET/);
    }
  }
});


test('sample kits open every paid question flow only in the active preview session', async () => {
  await loadSamples({ get: async () => null, create: async () => {} }, true);
  for (const id of [KIT_ID, EXPLANATION_KIT_ID] as const) {
    assert.equal(previewKit(id, false), null, 'release must never receive sample ownership');
    const kit = parseKitTemplates(previewKit(id, true));
    assert.ok(kit);
    assert.equal(kit.letters.length, id === KIT_ID ? 4 : 9);
    for (const letter of kit.letters) {
      const answers = Object.fromEntries(letter.questions.flatMap(q => q.fields.map(f => [f.name, 'Example'])));
      const output = renderKitLetter(letter, answers);
      assert.deepEqual(output.blanks, []);
      assert.match(output.text, /PREVIEW SAMPLE ONLY/);
      assert.ok(!output.text.includes('{{'));
    }
  }
  const sent = sampleLetters().find(letter => letter.status === 'sent')!;
  assert.ok(MAIL_METHODS.includes(sent.method as typeof MAIL_METHODS[number]));
});
