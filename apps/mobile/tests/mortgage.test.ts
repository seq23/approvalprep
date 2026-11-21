// The mortgage moment and the paid-once line (audience research, 21 Nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MORTGAGE_SOURCE, UNDERWRITER_CONDITIONS, showsMortgageCaution, showsUnderwriterGuide } from '../src/mortgage';
import { EXPLANATION_KIT_ID, kitForKind } from '../src/kitTemplates';
import { LETTERS } from '../src/letters';
import { situations } from '../src/studio';

const screen = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/letters', f), 'utf8');

test('every underwriter question opens a Letter of Explanation Kit letter, each a different one', () => {
  assert.ok(UNDERWRITER_CONDITIONS.length >= 5);
  for (const c of UNDERWRITER_CONDITIONS) {
    assert.equal(kitForKind(c.kind), EXPLANATION_KIT_ID, c.kind);
    assert.match(c.asks, /\?$/, 'each row is the underwriter’s own question');
  }
  assert.equal(new Set(UNDERWRITER_CONDITIONS.map(c => c.kind)).size, UNDERWRITER_CONDITIONS.length);
});

test('the guide shows on the mortgage situation’s first question only, and the caution before a dispute only', () => {
  assert.ok(situations.some(s => s.id === 'loan'), 'the Studio still has the loan situation the guide hangs on');
  assert.equal(showsUnderwriterGuide('loan', 0), true);
  assert.equal(showsUnderwriterGuide('loan', 1), false);
  assert.equal(showsUnderwriterGuide('rental', 0), false);
  assert.equal(showsUnderwriterGuide(undefined, 0), false);
  for (const l of LETTERS) assert.equal(showsMortgageCaution(l.kind, 0), l.kind === 'bureau-dispute' || l.kind === 'follow-up', l.kind);
  assert.equal(showsMortgageCaution('bureau-dispute', 1), false);
});

test('the dispute caution cites a dated https source', () => {
  assert.match(MORTGAGE_SOURCE.url, /^https:\/\/selling-guide\.fanniemae\.com\//);
  assert.match(MORTGAGE_SOURCE.read, /^\d{4}-\d{2}-\d{2}$/);
});

test('the screens a mortgage borrower meets draw the guide and the caution', () => {
  assert.match(screen('studio.tsx'), /showsUnderwriterGuide\(situation\.id, step\)[^\n]*<UnderwriterGuide \/>/);
  assert.match(screen('[kind].tsx'), /showsMortgageCaution\(kind, step\)[^\n]*<MortgageCaution \/>/);
  assert.match(screen('unlock.tsx'), /explanation \? <UnderwriterGuide open=\{owned\} \/>/);
});

test('every buy button is followed by the paid-once line', () => {
  for (const f of ['unlock.tsx', 'files.tsx', 'bundle.tsx']) {
    const lines = screen(f).split('\n');
    const buy = lines.findIndex(l => /<Button primary[^\n]*act\((?:'buy'|true)\)/.test(l));
    assert.ok(buy >= 0, `${f} has no buy button`);
    assert.match(lines[buy + 1], /\{PAID_ONCE_LINE\}/, `${f}: the paid-once line is not under the buy button`);
  }
});
