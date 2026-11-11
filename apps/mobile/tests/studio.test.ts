import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { situations, studioDraft } from '../src/studio';
// @ts-ignore shared website module is JavaScript
import { studioSituations, buildLetter } from '../../../src/data/letterStudio';

test('Studio uses every website situation and produces the same first pass with copy/share only', () => {
  assert.equal(situations, studioSituations);
  assert.equal(situations.length, 9);
  const today = new Date(2026, 10, 11);
  for (const s of situations) {
    const answers = { name: 'Sample Writer', happened: 'My hours changed', now: 'My hours are steady' };
    const draft = studioDraft(s.id, answers, today);
    assert.equal(draft.text, buildLetter(s.id, answers, { today }).text);
    assert.deepEqual(draft.actions, ['copy', 'share']);
    assert.equal(draft.kitName, s.recommendationName);
    assert.ok(draft.moments.length > 0);
    assert.ok(draft.moments.every(m => m.items.length > 0));
    assert.match(draft.text, /Sample Writer/);
    assert.match(studioDraft(s.id, {}, today).text, /\[/);
  }
  assert.throws(() => studioDraft('unknown', {}));
});

test('free Studio screen has no PDF, sent or reminder action, and dispute keeps its own path', () => {
  const screen = readFileSync(join(__dirname, '../app/(tabs)/letters/studio.tsx'), 'utf8');
  assert.doesNotMatch(screen, /expo-print|expo-sharing|letters\/sent|scheduleNotification|savedLetters/);
  assert.match(screen, /router.push\('\/letters\/bureau-dispute'\)/);
  assert.match(screen, /Clipboard.setStringAsync\(draft!\.text\)/);
  assert.match(screen, /Share.share\(\{ message: draft!\.text \}\)/);
});

test('Studio outputs do not contain private kit template sentences', t => {
  const file = process.env.APPROVALPREP_APP_TEMPLATES || join(homedir(), '.boss-os/approvalprep/app-templates/credit-letter-kit.json');
  if (!existsSync(file)) { t.diagnostic('NOTE [PRIVATE_TEMPLATES_ABSENT]: private wording comparison unavailable.'); return; }
  const kit = JSON.parse(readFileSync(file, 'utf8'));
  const sentences: string[] = kit.letters.flatMap((l: { template: string }) => l.template.split(/\{\{[^{}]*\}\}|\n|(?<=[.:?!])\s+/)).map((s: string) => s.trim()).filter((s: string) => s.length >= 60);
  assert.ok(sentences.length > 0);
  for (const s of situations) for (const sentence of sentences) assert.ok(!studioDraft(s.id, {}).text.includes(sentence), s.id);
});
