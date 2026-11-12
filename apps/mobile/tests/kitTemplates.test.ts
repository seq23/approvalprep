// The four kit letters render from a kit delivered to the phone. The wording here is MADE UP for
// tests: the real paid wording is never in this repo (docs/APP_PLAN.md), and the last test proves it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { KIT_KINDS, kitLetter, kitStore, parseKitTemplates, renderKitLetter } from '../src/kitTemplates';
import { LETTERS } from '../src/letters';
// @ts-ignore shared website module is JavaScript
import { kitSamples } from '../../../src/lib/kitSamples.mjs';

const sender = { title: 'FAKE who writes?', fields: [{ name: 'name', label: 'Fake name' }, { name: 'street', label: 'Fake street' }] };
const fakeLetter = (kind: string, extra: { name: string; label: string; multiline?: boolean }[], body: string, more: object = {}) => ({
  kind, name: `FAKE ${kind} letter`,
  questions: [sender, { title: 'FAKE who gets it?', fields: [{ name: 'to', label: 'Fake recipient' }] }, ...extra.map(f => ({ title: `FAKE ${f.name}?`, fields: [f] }))],
  template: `{{name|Fake name}}\n{{street|Fake street}}\n\n{{today}}\n\n{{to|Fake recipient}}\n\n${body}\n\nSincerely,\n\n\n{{name|Fake name}}`,
  ...more,
});
const FAKE_KIT = {
  version: 1, kit: 'credit-letter-kit', letters: [
    fakeLetter('goodwill', [{ name: 'month', label: 'Fake month' }, { name: 'why', label: 'Fake reason', multiline: true }],
      'FAKE TEST WORDING. The {{month|fake month}} wobble happened because {{why|fake reason}}. The {{month|fake month}} wobble is mine.', { honestLine: 'FAKE: they can say no.' }),
    fakeLetter('debt-validation', [{ name: 'ref', label: 'Fake reference' }, { name: 'seen', label: 'Fake date' }],
      'FAKE TEST WORDING. Re: {{ref|fake reference}}. You wrote on {{seen|fake date}}.', { notes: ['FAKE note one.', 'FAKE note two.'] }),
    fakeLetter('settlement-terms', [{ name: 'amount', label: 'Fake amount' }, { name: 'until', label: 'Fake last day' }],
      'FAKE TEST WORDING. I offer {{amount|fake amount}} until {{until|fake last day}}.', { honestLine: 'They may say no.' }),
    fakeLetter('follow-up', [{ name: 'mailed', label: 'Fake mailed date' }, { name: 'account', label: 'Fake account' }],
      'FAKE TEST WORDING. I wrote on {{mailed|fake mailed date}} about {{account|fake account}}.'),
  ],
};
const clone = () => JSON.parse(JSON.stringify(FAKE_KIT));
const today = new Date(2026, 10, 10);

test('the fixture covers exactly the four kit letters in the chooser', () => {
  const kit = parseKitTemplates(FAKE_KIT);
  assert.ok(kit);
  assert.deepEqual(kit.letters.map(l => l.kind).sort(), [...KIT_KINDS].sort());
  assert.deepEqual(LETTERS.filter(l => l.access === 'kit').map(l => l.kind).sort(), [...KIT_KINDS].sort());
  assert.equal(kitLetter(kit, 'bureau-dispute'), null);
  assert.equal(kitLetter(null, 'goodwill'), null);
});

for (const kind of KIT_KINDS) {
  test(`${kind}: answers fill the letter; unanswered blanks stay in [brackets]`, () => {
    const letter = kitLetter(parseKitTemplates(JSON.stringify(FAKE_KIT)), kind);
    assert.ok(letter);
    assert.ok(letter.questions.length >= 4 && letter.questions.length <= 6);
    const fields = letter.questions.flatMap(q => q.fields);
    const answers = Object.fromEntries(fields.map(f => [f.name, `Sample ${f.name} 42`]));
    const full = renderKitLetter(letter, answers, today);
    assert.deepEqual(full.blanks, []);
    assert.doesNotMatch(full.text, /\[|\{\{/);
    for (const value of Object.values(answers)) assert.ok(full.text.includes(value), value);
    assert.match(full.text, /November 10, 2026/);
    assert.match(full.text, /FAKE TEST WORDING/);

    const empty = renderKitLetter(letter, {}, today);
    assert.doesNotMatch(empty.text, /\{\{|Sample/);
    assert.equal(empty.blanks.length, new Set(empty.blanks).size);
    assert.ok(empty.blanks.length >= fields.length - 1);
    for (const blank of empty.blanks) assert.ok(empty.text.includes(`[${blank}]`), blank);

    // One answer missing: only that blank stays, and blank-looking answers count as missing.
    const last = fields.at(-1)!;
    const partial = renderKitLetter(letter, { ...answers, [last.name]: '   ' }, today);
    assert.equal(partial.blanks.length, 1);
    assert.ok(partial.text.includes(`[${partial.blanks[0]}]`));
  });
}

test('an answer ending in a full stop does not print two', () => {
  const letter = kitLetter(parseKitTemplates(FAKE_KIT), 'settlement-terms')!;
  const { text } = renderKitLetter(letter, { until: 'Dec. 1.' }, today);
  assert.ok(text.includes('until Dec. 1.\n'));
});

test('a malformed kit parses to null, never to a half-read kit', () => {
  const bad: [string, (kit: any) => unknown][] = [
    ['not json', () => '{"version": 1, "kit": '],
    ['nothing', () => null],
    ['a list', kit => kit.letters],
    ['another kit', kit => ({ ...kit, kit: 'some-other-kit' })],
    ['no version', kit => { delete kit.version; return kit; }],
    ['no letters', kit => ({ ...kit, letters: [] })],
    ['the free letter', kit => { kit.letters[0].kind = 'bureau-dispute'; return kit; }],
    ['the same kind twice', kit => { kit.letters[1].kind = 'goodwill'; return kit; }],
    ['one letter without a template', kit => { delete kit.letters[3].template; return kit; }],
    ['three questions', kit => { kit.letters[2].questions.pop(); return kit; }],
    ['seven questions', kit => { for (const n of ['a', 'b', 'c']) kit.letters[2].questions.push({ title: n, fields: [{ name: n, label: n }] }); return kit; }],
    ['a question with no field', kit => { kit.letters[0].questions[1].fields = []; return kit; }],
    ['a field with no label', kit => { delete kit.letters[0].questions[0].fields[0].label; return kit; }],
    ['a blank nobody is asked about', kit => { kit.letters[0].template += ' {{mystery|fake mystery}}'; return kit; }],
    ['a blank with no bracket words', kit => { kit.letters[0].template += ' {{name}}'; return kit; }],
    ['a question that never reaches the letter', kit => { kit.letters[0].questions[1].fields.push({ name: 'unused', label: 'Fake unused' }); return kit; }],
    ['a broken blank', kit => { kit.letters[0].template += ' {{name|'; return kit; }],
    ['an honest line that is not text', kit => { kit.letters[0].honestLine = 7; return kit; }],
    ['notes that are not text', kit => { kit.letters[1].notes = ['ok', 3]; return kit; }],
  ];
  for (const [what, breakIt] of bad) assert.equal(parseKitTemplates(breakIt(clone())), null, what);
  assert.ok(parseKitTemplates(clone()));
});

test('the phone keeps a delivered kit, and refuses to keep a malformed one', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const store = await kitStore({
    execAsync: async sql => { db.exec(sql); },
    runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
    getAllAsync: async <T>(sql: string, ...params: (string | number | null)[]) => db.prepare(sql).all(...params) as T[],
  });
  assert.equal(await store.read(), null);
  const broken = clone(); delete broken.letters[2].template;
  assert.equal(await store.save(broken), false);
  assert.equal(await store.read(), null);
  assert.equal(await store.save(FAKE_KIT), true);
  assert.deepEqual(await store.read(), parseKitTemplates(FAKE_KIT));
  assert.equal(await store.save(broken), false);
  assert.equal((await store.read())?.letters.length, 4);
  db.prepare('UPDATE delivered_kits SET body = ?').run('{"damaged":');
  assert.equal(await store.read(), null);
});

// ---- The paid wording stays out of this public repo and out of the app bundle. ----
const repo = join(__dirname, '..', '..', '..');
const SKIP = new Set(['node_modules', 'dist', '.expo', '.git', '.wrangler']);
function textFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : textFiles(path);
    return /\.(png|jpe?g|gif|webp|ico|ttf|otf|woff2?|pdf|docx|zip)$/i.test(entry.name) || statSync(path).size > 3_000_000 ? [] : [path];
  });
}
const squash = (s: string) => s.replace(/\s+/g, ' ');

test('no paid kit sentence is in apps/mobile or src', t => {
  const mobile = textFiles(join(repo, 'apps', 'mobile'));
  assert.ok(mobile.length > 20, `only ${mobile.length} app files were read`);
  const retired = /pay[\s_-]*for[\s_-]*delet/i;
  for (const file of mobile) assert.doesNotMatch(readFileSync(file, 'utf8'), retired, relative(repo, file));
  assert.match(['Pay', 'For ', 'Delete'].join('-'), retired);

  const privatePaths = [process.env.APPROVALPREP_APP_TEMPLATES || join(homedir(), '.boss-os', 'approvalprep', 'app-templates', 'credit-letter-kit.json'), join(homedir(), '.boss-os', 'approvalprep', 'app-templates', 'letter-of-explanation-kit.json')];
  for (const privatePath of privatePaths) {
  if (!existsSync(privatePath)) {
    t.diagnostic('NOTE [PRIVATE_TEMPLATES_ABSENT]: no private kit file on this machine, so no paid sentence was checked here. Only the retired-phrase check ran.');
    continue;
  }
  const kit = parseKitTemplates(readFileSync(privatePath, 'utf8'));
  assert.ok(kit, `${privatePath} is there but is not a valid kit`);
  const promises = /raise (your|my) (credit )?score|boost (your|my) (credit )?score|\bguarantee|remove (any|all|negative|accurate)|(?:fix|repair|clean|erase) (your|my) credit/i;
  for (const letter of kit.letters) assert.doesNotMatch([letter.template, letter.honestLine, ...(letter.notes ?? [])].join(' '), promises);
  const sentences = new Set<string>();
  for (const letter of kit.letters) {
    const pieces = [letter.template, letter.honestLine ?? '', ...(letter.notes ?? [])]
      .flatMap(part => part.split(/\{\{[^{}]*\}\}|\n|(?<=[.:?!])\s+/));
    for (const piece of pieces) { const s = squash(piece).trim(); if (s.length >= 60) sentences.add(s); }
  }
  assert.ok(sentences.size >= kit.letters.length * 3, `only ${sentences.size} paid sentences found to check`);
  // The website shows ONE filled sample page per kit, on purpose (kitSamples in src/lib/kitSamples.mjs).
  // Those lines may stay in that one file; nowhere else, and never in the app.
  const samplePage = join(repo, 'src', 'lib', 'kitSamples.mjs');
  const published = squash(Object.values(kitSamples as Record<string, { lines: string[] }>).flatMap(sample => sample.lines).join(' '));
  const files = [...mobile, ...textFiles(join(repo, 'src'))];
  for (const file of files) {
    const body = squash(readFileSync(file, 'utf8'));
    for (const s of sentences) {
      if (file === samplePage && published.includes(s)) continue;
      assert.ok(!body.includes(s), `${relative(repo, file)} contains paid kit wording: "${s.slice(0, 40)}…"`);
    }
  }
  t.diagnostic(`checked ${sentences.size} paid sentences against ${files.length} files`);
  }
});

test('one delivered purchase covers repeated letters and later dispute rounds offline without consuming ownership', async () => {
  const db = new DatabaseSync(':memory:');
  const adapter = { execAsync: async (sql: string) => { db.exec(sql); }, runAsync: async (sql: string, ...args: any[]) => db.prepare(sql).run(...args), getAllAsync: async <T>(sql: string, ...args: any[]) => db.prepare(sql).all(...args) as T[] };
  const original = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw Error('Offline'); };
  try {
    const store = await kitStore(adapter);
    assert.equal(kitLetter(await store.read(), 'follow-up'), null);
    assert.equal(await store.save(FAKE_KIT), true);
    for (const day of ['2026-11-11', '2027-01-11', '2028-11-11']) {
      const reopened = await kitStore(adapter);
      for (const kind of KIT_KINDS) {
        const letter = kitLetter(await reopened.read(), kind);
        assert.ok(letter, kind);
        assert.ok(renderKitLetter(letter, {}, new Date(day)).text);
      }
    }
    assert.deepEqual(await store.read(), parseKitTemplates(FAKE_KIT));
    assert.equal(networkCalls, 0);
  } finally { globalThis.fetch = original; db.close(); }
});
