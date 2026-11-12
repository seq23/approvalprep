import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as kits from '../src/kit';
import * as offers from '../src/purchases/bundleOffers';

test('bundle sales notice follows the switch and Restore hides internal errors', async () => {
  const compiled = ts.transpileModule(readFileSync(new URL('../app/(tabs)/letters/bundle.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const enabled of [false, true]) {
    const states: any[] = []; let index = 0; let focus!: () => void;
    const exports: any = {};
    const element = (type: any, props: any) => ({ type, props });
    runInNewContext(compiled, { exports, console: { warn() {} }, require: (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
      if (name === 'react') return { useState: (initial: any) => {
        const slot = index++; if (!(slot in states)) states[slot] = initial;
        return [states[slot], (value: any) => { states[slot] = value; }];
      }, useCallback: (cb: any) => cb };
      if (name === 'expo-router') return { useLocalSearchParams: () => ({}), useFocusEffect: (cb: any) => { focus = cb; }, router: {} };
      if (name === 'react-native') return { Text: 'Text', Linking: {} };
      if (name.endsWith('/ui')) return { Button: 'Button', Row: 'Row', Sheet: 'Sheet', Screen: 'Screen' };
      if (name.endsWith('/theme')) return { type: {} };
      if (name.endsWith('/copy')) return { HONEST_LIMIT: 'limit' };
      if (name.endsWith('/kit')) return { ...kits, KIT_SALES_ENABLED: enabled };
      if (name.endsWith('/bundleOffers')) return offers;
      if (name.endsWith('/bundleFiles')) return { bundleFile: async () => null };
      if (name.endsWith('/bundleAccount')) return { bundleAccount: async () => ({ ownership: async () => offers.NO_OWNERSHIP, products: async () => [], mock: true }) };
      if (name.endsWith('/bundleDelivery')) return { restoreBundle: async () => { throw Error('STORE_ACCOUNTS_NOT_READY'); } };
      throw Error(name);
    } });
    const render = () => { index = 0; return exports.default(); };
    const flatten = (node: any): any[] => !node ? [] : Array.isArray(node) ? node.flatMap(flatten) : typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
    render(); focus(); await new Promise(resolve => setImmediate(resolve));
    const nodes = flatten(render());
    assert.equal(nodes.some(n => n.props?.children === 'Purchases are not available yet.'), !enabled);
    nodes.find(n => n.type === 'Button' && n.props.label === 'Restore purchase').props.onPress();
    await new Promise(resolve => setImmediate(resolve));
    const alert = flatten(render()).find(n => n.props?.accessibilityRole === 'alert');
    assert.ok(alert);
    assert.equal(alert.props.children.includes('STORE_ACCOUNTS_NOT_READY'), false);
  }
});
