import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('returning from Restore refreshes the mounted chooser and opens delivered kit letters', async () => {
  let state: unknown = null;
  const reads: ((kit: unknown) => void)[] = [];
  let focus!: () => () => void;
  const routes: any[] = [];
  const element = (type: unknown, props: unknown) => ({ type, props });
  const source = readFileSync(new URL('../app/(tabs)/letters/index.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports: { default?: () => any } = {};
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return {
      useState: (initial: unknown) => [state ?? initial, (value: unknown) => { state = value; }],
      useCallback: (callback: () => void) => callback,
    };
    if (name === 'expo-router') return { router: { push: (route: string) => routes.push(route) },
      useFocusEffect: (callback: typeof focus) => { focus = callback; } };
    if (name === 'react-native') return { Text: 'Text' };
    if (name.endsWith('/theme')) return { type: {} };
    if (name.endsWith('/ui')) return { Row: 'Row', Screen: 'Screen' };
    if (name.endsWith('/offers')) return { BUNDLE_OFFER: {}, CREDIT_KIT: {}, EXPLANATION_KIT_OFFER: {}, STUDIO_COUNT: 9, kitOfferFor: () => ({ name: 'Kit', productId: 'kit' }), lockedLine: () => 'locked', offerTitle: () => 'title' };
    if (name.endsWith('/prices')) return { usePrices: () => ({}) };
    if (name.endsWith('/letters')) return { EXPLANATION_LETTERS: [], LETTERS: [{ kind: 'goodwill', name: 'Goodwill', access: 'kit' }] };
    if (name.endsWith('/kitTemplates')) return {
      EXPLANATION_KIT_ID: 'letter-of-explanation-kit', kitForKind: () => 'credit-letter-kit',
      loadDeliveredKit: () => new Promise(resolve => reads.push(resolve)), kitLetter: (value: unknown) => value,
    };
    throw new Error(`Unexpected import: ${name}`);
  } });
  // The one kit letter in this list: the row under the Credit Letter Kit heading and its "See the kit" row.
  const render = () => exports.default!().props.children[6][0].props.onPress;
  render();
  const blur = focus();
  reads.shift()!(null);
  reads.shift()!(null);
  await new Promise(resolve => setImmediate(resolve));
  render()();
  assert.equal(routes.pop().pathname, '/letters/unlock');
  blur();
  // A previous visit can still be reading storage when Restore finishes.
  const staleBlur = focus();
  const staleRead = reads.shift()!;
  const staleOtherRead = reads.shift()!;
  staleBlur();
  focus();
  reads.shift()!({ letters: ['delivered'] });
  reads.shift()!(null);
  await new Promise(resolve => setImmediate(resolve));
  render()();
  assert.equal(routes.pop(), '/letters/goodwill');
  staleRead(null);
  staleOtherRead(null);
  await new Promise(resolve => setImmediate(resolve));
  render()();
  assert.equal(routes.pop(), '/letters/goodwill');
});
