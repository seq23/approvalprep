import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as letterQuestions from '../src/letterQuestions';
import type { SavedLetter } from '../src/letterStorage';

test('opening a letter stores nothing; the first answer creates the draft, later answers update it', async () => {
  const source = readFileSync(new URL('../app/(tabs)/letters/[kind].tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const rows = new Map<string, SavedLetter>();
  const calls: string[] = [];
  const store = {
    get: async (id: string) => rows.get(id) ?? null,
    create: async (letter: SavedLetter) => { assert.ok(!rows.has(letter.id)); calls.push('create'); rows.set(letter.id, letter); },
    update: async (letter: SavedLetter) => { assert.ok(rows.has(letter.id)); calls.push('update'); rows.set(letter.id, letter); },
  };
  const state: any[] = []; const refs: any[] = []; let cursor = 0; let refAt = 0; let effect: (() => void) | undefined;
  const element = (type: unknown, props: any) => ({ type, props });
  const exports: any = {};
  runInNewContext(compiled, { exports, Date, Math, console, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return {
      useState: (initial: any) => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (value: any) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
      useRef: (current: any) => { const i = refAt++; return refs[i] ?? (refs[i] = { current }); },
      useEffect: (fn: any) => { effect = fn; },
    };
    if (name === 'expo-router') return { useLocalSearchParams: () => ({ kind: 'bureau-dispute' }), router: {} };
    if (name.endsWith('/phoneDatabase')) return { storageDeadline: (work: Promise<any>) => work };
    if (name.endsWith('/letterQuestions')) return letterQuestions;
    if (name.endsWith('/kitTemplates')) return { kitForKind: () => 'credit-letter-kit', ALL_KIT_KINDS: [] };
    if (name.endsWith('/savedLetters')) return { savedLetters: async () => store };
    if (name.endsWith('/theme')) return { type: {}, space: {} };
    if (name.endsWith('/letters')) return { LETTERS: [], EXPLANATION_LETTERS: [], isCreditLetter: () => true };
    if (name.endsWith('/ui')) return { Screen: 'Screen', Button: 'Button', Field: 'Field', Row: 'Row' };
    return {};
  } });
  const render = () => { cursor = 0; refAt = 0; return exports.default(); };
  const settle = () => new Promise(resolve => setTimeout(resolve, 5));
  const field = () => {
    const nodes: any[] = [];
    (function walk(node: any) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); })(render());
    return nodes.find(node => node.type === 'Field');
  };
  render(); effect!(); await settle();
  assert.ok(field(), 'the first question is shown');
  assert.deepEqual(calls, []);
  assert.equal(rows.size, 0);
  field().props.onChangeText('Ada'); await settle();
  assert.deepEqual(calls, ['create']);
  field().props.onChangeText('Ada Lovelace'); await settle();
  assert.deepEqual(calls, ['create', 'update']);
  assert.equal(rows.size, 1);
  assert.ok(Object.values([...rows.values()][0].answers).includes('Ada Lovelace'));
});
