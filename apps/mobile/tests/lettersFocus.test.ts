import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('returning from Restore refreshes the mounted chooser and opens delivered kit letters', async () => {
  let kit: unknown = null, state: unknown = null;
  let focus!: () => () => void;
  const routes: string[] = [];
  const element = (type: unknown, props: unknown) => ({ type, props });
  const source = readFileSync(new URL('../app/(tabs)/letters/index.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports: { default?: () => any } = {};
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return {
      useState: () => [state, (value: unknown) => { state = value; }],
      useCallback: (callback: () => void) => callback,
    };
    if (name === 'expo-router') return { router: { push: (route: string) => routes.push(route) },
      useFocusEffect: (callback: typeof focus) => { focus = callback; } };
    if (name.endsWith('/ui')) return { Row: 'Row', Screen: 'Screen' };
    if (name.endsWith('/letters')) return { LETTERS: [{ kind: 'goodwill', name: 'Goodwill', access: 'kit' }] };
    if (name.endsWith('/kitTemplates')) return {
      loadDeliveredKit: async () => kit, kitLetter: (value: unknown) => value,
    };
    throw new Error(`Unexpected import: ${name}`);
  } });
  const render = () => exports.default!().props.children[1][0].props.onPress;
  render();
  const blur = focus();
  await Promise.resolve();
  render()();
  assert.equal(routes.pop(), '/letters/unlock');
  blur();
  kit = { letters: ['delivered'] };
  focus();
  await Promise.resolve();
  render()();
  assert.equal(routes.pop(), '/letters/goodwill');
});
