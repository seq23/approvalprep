import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as kits from '../src/kit';
import * as offers from '../src/purchases/bundleOffers';
import * as realOffers from '../src/offers';

// Buying is possible only with the switch on AND a real store. Whenever it is not, the Get button is
// off and one line says so; a live-looking button never sits under a line saying nothing can be bought.
test('the bundle Get button and its notice follow the sales switch and the store, and Restore hides internal errors', async () => {
  const compiled = ts.transpileModule(readFileSync(new URL('../app/(tabs)/letters/bundle.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  // preview: the free web preview, whose purchases are pretend and session-only.
  for (const enabled of [false, true]) for (const mock of [false, true]) for (const preview of mock ? [false, true] : [false]) {
    const bought: string[] = [];
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
      if (name.endsWith('/previewSamples')) return { PREVIEW_ENABLED: false };
      if (name.endsWith('/offers')) return { KIT_OFFERS: [], KIT_ORDER: realOffers.KIT_ORDER, PRODUCTS: realOffers.PRODUCTS, BUNDLE_LINE: realOffers.BUNDLE_LINE, upgradeLine: realOffers.upgradeLine, productName: realOffers.productName, productRoute: realOffers.productRoute, TRACKING_LINE: 'tracking', bundleFilesLine: () => 'files', bundleWebsiteKits: () => ['A kit'], offerTitle: (name: string) => name };
      if (name.endsWith('/prices')) return { storePrices: async () => ({ [kits.COMPLETE_BUNDLE.productId]: 'price' }) };
      if (name.endsWith('/kit')) return { ...kits, KIT_SALES_ENABLED: enabled };
      if (name.endsWith('/bundleOffers')) return offers;
      if (name.endsWith('/bundleFiles')) return { bundleFile: async () => null };
      if (name.endsWith('/bundleAccount')) return { bundleAccount: async () => ({ ownership: async () => bought.length ? { ...offers.NO_OWNERSHIP, bundle: true } : offers.NO_OWNERSHIP, products: async () => [], mock, preview, buy: async (id: string) => { bought.push(id); } }) };
      if (name.endsWith('/bundleDelivery')) return { restoreBundle: async () => { throw Error('STORE_ACCOUNTS_NOT_READY'); } };
      throw Error(name);
    } });
    const render = () => { index = 0; return exports.default(); };
    const flatten = (node: any): any[] => !node ? [] : Array.isArray(node) ? node.flatMap(flatten) : typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
    render(); focus(); await new Promise(resolve => setImmediate(resolve));
    const nodes = flatten(render());
    const canBuy = (enabled && !mock) || preview;
    assert.equal(nodes.some(n => n.props?.testID === 'buying-off'), !canBuy);
    assert.equal(nodes.some(n => n.props?.testID === 'buying-pretend'), preview);
    const get = nodes.find(n => n.type === 'Button' && String(n.props.label).startsWith('Get the bundle'));
    assert.equal(get.props.disabled, !canBuy);
    // Every kit she does not own is named under Other options, in the website's order.
    assert.deepEqual(nodes.filter(n => n.type === 'Row').map(n => n.props.title), realOffers.KIT_ORDER.map(realOffers.productName));
    if (preview) {
      get.props.onPress(); await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(bought, [kits.COMPLETE_BUNDLE.productId]);
      const after = flatten(render());
      assert.match(after.find(n => n.props?.accessibilityRole === 'alert').props.children, /Nothing was charged/);
      // Each kit's files are one tap away, and no store download is attempted.
      assert.equal(after.filter(n => n.type === 'Row' && String(n.props.title).endsWith('your files ›')).length, 7);
      continue;
    }
    nodes.find(n => n.type === 'Button' && n.props.label === 'Restore purchase').props.onPress();
    await new Promise(resolve => setImmediate(resolve));
    const alert = flatten(render()).find(n => n.props?.accessibilityRole === 'alert');
    assert.ok(alert);
    assert.equal(alert.props.children.includes('STORE_ACCOUNTS_NOT_READY'), false);
  }
});
