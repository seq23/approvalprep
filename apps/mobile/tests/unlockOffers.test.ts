import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as kits from '../src/kit';
import * as offers from '../src/purchases/bundleOffers';
test('kit screen orders offers and routes options without reselling owned kits', async () => {
  for (const requested of ['credit-letter-kit', 'letter-of-explanation-kit']) {
    for (const creditKit of [false, true]) for (const explanationKit of [false, true]) for (const bundle of [false, true]) {
      const ownership = { creditKit: creditKit || bundle, explanationKit: explanationKit || bundle, bundle };
      const states: any[] = []; let index = 0; let focus!: () => void;
      const routes: any[] = [];
      const source = readFileSync(new URL('../app/(tabs)/letters/unlock.tsx', import.meta.url), 'utf8');
      const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      const exports: any = {};
      const prices = [kits.KIT.productId, kits.EXPLANATION_KIT.productId, kits.COMPLETE_BUNDLE.productId, kits.BUNDLE_UPGRADE.productId].map(id => ({ id, price: `price:${id}` }));
      runInNewContext(compiled, { exports, console, require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) };
        if (name === 'react') return { useState: (initial: any) => { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], (value: any) => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; }, useCallback: (cb: any) => cb };
        if (name === 'expo-router') return { useLocalSearchParams: () => ({ kit: requested }), useFocusEffect: (cb: any) => { focus = cb; }, router: { push: (route: any) => routes.push(route) } };
        if (name === 'react-native') return { Text: 'Text', Linking: {} };
        if (name.endsWith('/ui')) return { Button: 'Button', Row: 'Row', Sheet: 'Sheet', Screen: 'Screen' };
        if (name.endsWith('/theme')) return { type: {} };
        if (name.endsWith('/copy')) return { HONEST_LIMIT: 'limit', REQUEST_LINE: 'request' };
        if (name.endsWith('/previewSamples')) return { PREVIEW_ENABLED: false };
        if (name.endsWith('/offers')) return { TRACKING_LINE: 'tracking', kitOfferFor: () => ({ name: 'Other kit', what: 'what', productId: 'other' }), websiteDifference: () => 'difference' };
        // Buying is on here, so the Get button counts as an offer exactly when the kit is for sale.
        if (name.endsWith('/kit')) return { ...kits, KIT_SALES_ENABLED: true };
        if (name.endsWith('/letters')) return { LETTERS: [], EXPLANATION_LETTERS: [] };
        if (name.endsWith('/kitTemplates')) return { KIT_ID: 'credit-letter-kit', EXPLANATION_KIT_ID: 'letter-of-explanation-kit', loadDeliveredKit: async (id: string) => (id === 'credit-letter-kit' ? ownership.creditKit : ownership.explanationKit) ? {} : null };
        if (name.endsWith('/bundleOffers')) return offers;
        if (name.endsWith('/bundleFiles')) return { bundleFile: async () => bundle ? 'file' : null };
        if (name.endsWith('/bundleAccount')) return { bundleAccount: async () => ({ ownership: async () => ownership, products: async () => prices }) };
        if (name.endsWith('/purchases')) return { purchases: async () => ({ products: async () => prices, mode: 'store' }) };
        if (name.endsWith('/provider') || name.endsWith('/delivery') || name.endsWith('/bundleDelivery')) return {};
        throw Error(name);
      } });
      const render = () => { index = 0; return exports.default(); };
      render(); focus(); await new Promise(resolve => setImmediate(resolve));
      const flatten = (node: any): any[] => !node ? [] : Array.isArray(node) ? node.flatMap(flatten) : typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
      const expected = offers.offersFor(ownership, requested === 'credit-letter-kit' ? 'credit' : 'explanation');
      const enabled = flatten(render()).filter(e => (e.type === 'Row' || (e.type === 'Button' && e.props.label.startsWith('Get this kit'))) && !e.props.disabled);
      assert.equal(enabled.length, expected.length);
      for (let n = 0; n < expected.length; n++) {
        const element = enabled[n];
        assert.ok((element.props.sub || element.props.label).includes(`price:${expected[n]}`));
        if (element.type === 'Row') {
          element.props.onPress(); const route = routes.pop();
          assert.equal(route.pathname, expected[n] === kits.COMPLETE_BUNDLE.productId || expected[n] === kits.BUNDLE_UPGRADE.productId ? '/letters/bundle' : '/letters/unlock');
          if (route.pathname === '/letters/unlock') assert.equal(route.params.kit, expected[n] === kits.KIT.productId ? 'credit-letter-kit' : 'letter-of-explanation-kit');
        }
      }
    }
  }
});

test('Restore messages survive ownership refresh even when the store is offline', async () => {
  for (const outcome of ['success', 'missing', 'partial', 'failure', 'bundle']) for (const offline of [false, true]) {
    const states: any[] = []; let index = 0; let focus!: () => void;
    let delivered = false; let refresh = false;
    // 'bundle' is a bundle buyer on a new phone: no single-kit purchase exists for her.
    const bundleOwner = outcome === 'bundle';
    const source = readFileSync(new URL('../app/(tabs)/letters/unlock.tsx', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports: any = {};
    runInNewContext(compiled, { exports, console: { warn() {} }, require: (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) };
      if (name === 'react') return {
        useState: (initial: any) => { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], (value: any) => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
        useCallback: (cb: any) => cb,
      };
      if (name === 'expo-router') return { useLocalSearchParams: () => ({}), useFocusEffect: (cb: any) => { focus = cb; }, router: {} };
      if (name === 'react-native') return { Text: 'Text', Linking: {} };
      if (name.endsWith('/ui')) return { Button: 'Button', Row: 'Row', Sheet: 'Sheet', Screen: 'Screen' };
      if (name.endsWith('/theme')) return { type: {} };
      if (name.endsWith('/copy')) return { HONEST_LIMIT: 'limit', REQUEST_LINE: 'request' };
      if (name.endsWith('/previewSamples')) return { PREVIEW_ENABLED: false };
      if (name.endsWith('/offers')) return { TRACKING_LINE: 'tracking', kitOfferFor: () => ({ name: 'Other kit', what: 'what', productId: 'other' }), websiteDifference: () => 'difference' };
      if (name.endsWith('/kit')) return kits;
      if (name.endsWith('/letters')) return { LETTERS: [], EXPLANATION_LETTERS: [] };
      if (name.endsWith('/kitTemplates')) return {
        KIT_ID: 'credit-letter-kit', EXPLANATION_KIT_ID: 'letter-of-explanation-kit',
        loadDeliveredKit: async (id: string) => delivered && id === 'credit-letter-kit' ? {} : null,
        saveDeliveredKit: async () => { delivered = true; },
      };
      if (name.endsWith('/bundleOffers')) return offers;
      if (name.endsWith('/bundleFiles')) return { bundleFile: async () => null, installBundle: async () => { delivered = true; } };
      if (name.endsWith('/bundleDelivery')) return { restoreBundle: async (_account: unknown, install: () => Promise<void>) => { if (!bundleOwner) return false; await install(); return true; } };
      if (name.endsWith('/bundleAccount')) return { bundleAccount: async () => ({ products: async () => [], ownership: async () => offers.NO_OWNERSHIP }) };
      if (name.endsWith('/purchases')) return { purchases: async () => ({ products: async () => {
        if (refresh && offline) throw Error('offline');
        return [];
      }, mode: 'mock' }) };
      if (name.endsWith('/provider')) return {};
      if (name.endsWith('/delivery')) return { restoreKit: async (_provider: unknown, save: () => Promise<void>) => {
        if (outcome === 'success' || outcome === 'partial') await save();
        if (outcome === 'partial') throw Error('KIT_RESTORE_PARTIAL');
        if (outcome === 'failure') throw Error('STORE_ACCOUNTS_NOT_READY');
        return outcome === 'success';
      } };
      throw Error(name);
    } });
    const flatten = (node: any): any[] => !node ? [] : Array.isArray(node) ? node.flatMap(flatten) : typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
    const render = () => { index = 0; return flatten(exports.default()); };
    const alert = () => render().find(node => node.props.accessibilityRole === 'alert')?.props.children;
    render(); focus(); await new Promise(resolve => setImmediate(resolve));
    render().find(node => node.type === 'Button' && node.props.label === 'Restore purchase').props.onPress();
    await new Promise(resolve => setImmediate(resolve));
    const result = alert();
    assert.ok(result, `Restore must report ${outcome}`);
    assert.equal(delivered, outcome === 'success' || outcome === 'partial' || outcome === 'bundle');
    // The revision dependency reruns the focus effect after Restore finishes.
    refresh = true; render(); focus(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(alert(), result, `${outcome} result must survive ${offline ? 'offline' : 'successful'} refresh`);
    if (delivered) assert.ok(render().some(node => node.props.label === 'Write a kit letter ›'));
  }
});
