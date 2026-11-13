import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { color, space, type, radius, tap } from '../src/theme';
import { myLetters } from '../src/myLetters';
import { newDispute } from '../src/letterQuestions';

test('list status backgrounds stay neutral or gold for drafts, waiting, due, overdue and answered letters', () => {
  const today = new Date();
  const mailed = new Date(today); mailed.setDate(mailed.getDate() - 30);
  const date = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const sent = { ...newDispute('due'), status: 'sent' as const, sentDate: date(mailed) };
  const earlier = new Date(mailed); earlier.setDate(earlier.getDate() - 1);
  const letters = [newDispute('draft'), { ...sent, id: 'waiting', sentDate: date(today) }, sent,
    { ...sent, id: 'overdue', sentDate: date(earlier) }, { ...sent, id: 'answered', status: 'answered' as const, answeredAt: today.toISOString() }];
  const element = (type: any, props: any) => ({ type, props });
  function load(path: string, imports: Record<string, any>) {
    const exports: any = {};
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
      { exports, require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
        if (name in imports) return imports[name];
        throw Error(`Unexpected import ${name}`);
      } });
    return exports;
  }
  const native = { Text: 'Text', View: 'View', Pressable: 'Pressable', StyleSheet: { create: (s: any) => s } };
  const ui = load('../src/ui.tsx', { react: {}, 'react-native': native, 'react-native-safe-area-context': {},
    './theme': { color, space, type, radius, tap }, './copy': {}, './screens': {}, './nav': {} });
  let index = 0;
  const states = [letters, true, 'ready', null, '', false];
  const screen = load('../app/(tabs)/mine/index.tsx', {
    react: { useState: () => [states[index++], () => {}], useCallback: (f: any) => f },
    'expo-router': { router: {}, useFocusEffect: () => {} }, 'react-native': native,
    '../../../src/ui': { ...ui, Screen: 'Screen', BottomSheet: 'BottomSheet', Button: 'Button' },
    '../../../src/theme': { color, space, type }, '../../../src/savedLetters': {}, '../../../src/kitTemplates': {},
    '../../../src/myLetters': { myLetters }, '../../../src/studioDrafts': {}, '../../../src/nav': {},
  }).default();
  const rows = screen.props.children[4];
  assert.equal(rows.length, 5);
  const backgrounds: string[] = [];
  function inspect(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(inspect); return; }
    if (typeof node.type === 'function') { inspect(node.type(node.props)); return; }
    const styles = [node.props?.style].flat(Infinity).filter(Boolean);
    for (const style of styles) for (const [key, value] of Object.entries(style)) {
      if (/color/i.test(key)) assert.ok([color.carbon, color.carbonMuted, color.rule, color.highlighter].includes(value as any), `Unexpected list colour ${value}`);
      if (key === 'backgroundColor') backgrounds.push(value as string);
    }
    inspect(node.props?.children);
  }
  rows.forEach(inspect);
  assert.deepEqual(backgrounds, [color.highlighter, color.highlighter]);
});
