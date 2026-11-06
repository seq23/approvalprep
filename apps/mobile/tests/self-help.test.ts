// R-ADV-13 (risk brain): every credit surface ends with the self-help line, word for word, and
// nothing in the app or its store listing promises an outcome. These are safety checks, not wording pins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SELF_HELP_LINE } from '../src/copy';

const root = path.join(__dirname, '..');
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const screens = walk(path.join(root, 'app')).filter((f) => f.endsWith('.tsx') && !path.basename(f).startsWith('_'));

test('the self-help line is the R-ADV-13 sentence, word for word', () => {
  assert.equal(SELF_HELP_LINE, 'Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.');
});

test('every screen is drawn inside <Screen>, which always ends with the self-help line', () => {
  assert.ok(screens.length >= 8, `expected the 8 planned screens, found ${screens.length}`);
  for (const f of screens) assert.match(fs.readFileSync(f, 'utf8'), /<Screen[\s>]/, `${path.relative(root, f)} does not use <Screen>`);
  const ui = fs.readFileSync(path.join(root, 'src/ui.tsx'), 'utf8');
  assert.match(ui, /\{SELF_HELP_LINE\}/, 'Screen no longer renders SELF_HELP_LINE');
});

// Outcome promises the Credit Repair Organizations Act and R-ADV-13 rule out.
const PROMISES = [/raise (your|my) (credit )?score/i, /boost (your|my) (credit )?score/i, /\bguarantee/i,
  /remove (any|all|negative|accurate)/i, /(fix|repair|clean|erase) (your|my) credit/i, /we (will )?(dispute|contact|send) .* for you/i, /points? (higher|raised|increase)/i];

test('no screen, letter or store text promises an outcome', () => {
  const files = [...screens, ...walk(path.join(root, 'src')), ...walk(path.join(root, 'store'))];
  assert.ok(files.length > 10);
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8').replace(SELF_HELP_LINE, '');
    for (const p of PROMISES) assert.doesNotMatch(text, p, `${path.relative(root, f)} matches ${p}`);
  }
});

test('the store description ends with the self-help line', () => {
  assert.equal(fs.readFileSync(path.join(root, 'store/en.md'), 'utf8').trim().split('\n').at(-1), SELF_HELP_LINE);
});
