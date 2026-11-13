import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openWhenFree, sharedDatabase, storageDeadline } from '../src/phoneDatabase';
test('concurrent kit readers share one open; a stalled worker fails and permits retry', async () => {
  let calls = 0;
  const db = {};
  const open = sharedDatabase(async () => { calls++; return db; });
  assert.deepEqual(await Promise.all([open('kits'), open('kits'), open('kits')]), [db, db, db]);
  assert.equal(calls, 1);
  let stalled = true;
  const retry = sharedDatabase(async () => stalled ? new Promise<{}>(() => {}) : db, 5);
  await assert.rejects(storageDeadline(retry('kits'), 20), /PHONE_STORAGE_UNAVAILABLE/);
  stalled = false;
  assert.equal(await retry('kits'), db);
});

test('two databases opened together open one after the other, never at once', async () => {
  let inFlight = 0, most = 0;
  const order: string[] = [];
  const open = sharedDatabase(async (name: string) => {
    most = Math.max(most, ++inFlight); order.push(`start ${name}`);
    await new Promise(resolve => setTimeout(resolve, 5));
    inFlight--; order.push(`end ${name}`);
    return name;
  });
  assert.deepEqual(await Promise.all([open('letters'), open('kits')]), ['letters', 'kits']);
  assert.equal(most, 1);
  assert.deepEqual(order, ['start letters', 'end letters', 'start kits', 'end kits']);
});
test('a failed open logs its real reason once and does not block the next open', async () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { lines.push(args.join(' ')); };
  try {
    let broken = true;
    const open = sharedDatabase(async (name: string) => { if (broken) throw Error('xLock is undefined'); return name; });
    await assert.rejects(open('letters'), /xLock is undefined/);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /letters.*xLock is undefined/);
    broken = false;
    assert.equal(await open('kits'), 'kits');
    assert.equal(await open('letters'), 'letters');
  } finally { console.error = original; }
});

test('a store held by another tab is never started; it opens once the files are free, and Try again works', async () => {
  let held = 2, opens = 0;
  const open = openWhenFree(async () => held-- <= 0, async (name: string) => { opens++; return name; }, 5, 1);
  assert.equal(await open('letters'), 'letters');
  assert.equal(opens, 1);
  let busy = true, asked = 0; opens = 0;
  const lines: string[] = []; const original = console.error;
  console.error = (...args: unknown[]) => { lines.push(args.join(' ')); };
  try {
    const shared = sharedDatabase(openWhenFree(async () => { asked++; return !busy; }, async (name: string) => { opens++; return name; }, 3, 1));
    await assert.rejects(shared('letters'), /PHONE_STORAGE_BUSY/);
    assert.equal(asked, 3);
    assert.equal(opens, 0, 'the store was not touched while busy');
    assert.match(lines[0], /PHONE_STORAGE_BUSY/);
    busy = false;
    assert.equal(await shared('letters'), 'letters');
    assert.equal(await shared('kits'), 'kits');
    assert.equal(asked, 4, 'once started, later opens do not ask again');
  } finally { console.error = original; }
});

import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
for (const screen of ['[kind]', 'sent']) test(`${screen}: stalled storage ends in an error with retry and a way back`, async () => {
  const source = readFileSync(new URL(`../app/(tabs)/letters/${screen}.tsx`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const state: any[] = []; let cursor = 0; let effect: (() => void) | undefined;
  const element = (type: unknown, props: any) => ({ type, props });
  const exports: any = {};
  const stalled = () => new Promise(() => {});
  runInNewContext(compiled, { exports, Date, Math, console, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return {
      useState: (initial: any) => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (value: any) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
      useRef: (current: any) => ({ current }), useCallback: (fn: any) => fn,
      useEffect: (fn: any) => { effect = fn; },
    };
    if (name === 'expo-router') return { useLocalSearchParams: () => ({ kind: 'goodwill', id: 'saved' }), useFocusEffect: (fn: any) => { effect = fn; }, router: {} };
    if (name.endsWith('/phoneDatabase')) return { storageDeadline: (work: Promise<any>) => storageDeadline(work, 5) };
    if (name.endsWith('/kitTemplates')) return { loadDeliveredKit: stalled, kitForKind: () => 'credit-letter-kit', ALL_KIT_KINDS: ['goodwill'] };
    if (name.endsWith('/savedLetters')) return { savedLetters: stalled };
    if (name.endsWith('/theme')) return { type: {}, space: {} };
    if (name.endsWith('/sentLetter')) return { dateInput: () => '', MAIL_METHODS: [], reminderDate: () => '' };
    if (name.endsWith('/myLetters')) return { showDate: () => '' };
    if (name.endsWith('/letters')) return { LETTERS: [], EXPLANATION_LETTERS: [] };
    if (name.endsWith('/ui')) return { Screen: 'Screen', Button: 'Button' };
    return {};
  } });
  const render = () => { cursor = 0; return exports.default(); };
  render(); effect!();
  await new Promise(resolve => setTimeout(resolve, 15));
  const tree = render();
  const nodes: any[] = [];
  function walk(node: any) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); }
  walk(tree);
  assert.ok(nodes.some(node => node.props?.accessibilityRole === 'alert'));
  const retryButton = nodes.find(node => node.type === 'Button' && node.props.label === 'Try again');
  assert.ok(retryButton);
  assert.equal(nodes.filter(node => node.type === 'Button').length, 2);
  retryButton.props.onPress(); render(); effect!();
  assert.ok(!JSON.stringify(render()).includes('"accessibilityRole":"alert"'));
  await new Promise(resolve => setTimeout(resolve, 15));
});
