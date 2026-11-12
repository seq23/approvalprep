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

// Inspect executable text so comments and store-supplied interpolated prices are not mistaken for copy.
import ts from 'typescript';
const money = /(?:[$£€]\s*\d|\b\d+(?:[.,]\d{2})?\s*(?:USD|GBP|EUR)\b)/i;
const competitor = /\b(?:Credit\s+Saint|Lexington\s+Law|The\s+Credit\s+People|Sky\s+Blue\s+Credit|CreditRepair\.com)\b/i;
function literals(file: string) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const values: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node) || node.kind === ts.SyntaxKind.TemplateHead || node.kind === ts.SyntaxKind.TemplateMiddle || node.kind === ts.SyntaxKind.TemplateTail) values.push((node as ts.StringLiteral).text);
    ts.forEachChild(node, visit);
  }
  visit(source); return values;
}
test('app copy has no competitor names or fixed prices outside approved products and mock providers', () => {
  const files = [...screens, ...walk(path.join(root, 'src')).filter(file => /\.tsx?$/.test(file))];
  assert.ok(files.length > 10);
  const priceSources = new Set(['src/kit.ts', 'src/purchases/provider.ts', 'src/purchases/bundleAccount.ts']);
  // Negative controls: a newly introduced competitor or fixed price must be detected.
  assert.ok(competitor.test('Credit Saint')); assert.ok(money.test('$79.99')); assert.ok(money.test('79.99 USD'));
  assert.ok(!money.test('Get this kit, '));
  for (const file of files) for (const value of literals(file)) {
    const name = path.relative(root, file);
    assert.doesNotMatch(value, competitor, name);
    if (!priceSources.has(name)) assert.doesNotMatch(value, money, name);
  }
});
