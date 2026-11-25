import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as kits from '../src/kit';
import * as realOffers from '../src/offers';
import * as realCopy from '../src/copy';
import * as realMore from '../src/more';
import * as bundleOffers from '../src/purchases/bundleOffers';
// @ts-ignore plain .mjs shared with the live check
import { appPagePaths, appViewProblems, appViewUrl } from '../../../scripts/ops/app-view.mjs';
// @ts-ignore plain .js Pages Function
import { APP_PAGES } from '../../../functions/api/app-page/[[path]].js';

// App Review guideline 3.1.1 (ship-ready app-review.md row 1): home and the three paywalls never point
// a buyer at approvalprep.com or at the website-order unlock. That unlock lives in More only, where a
// returning website buyer looks for it (tests/moreOrderLink.test.ts proves it still works there).
const SCREENS = ['index', 'letters/unlock', 'letters/bundle', 'letters/files'];

// Any module the screen needs but this test does not care about: callable, never settles when awaited, empty as text.
const stub = (): any => new Proxy(function () {}, {
  get: (_t, key) => key === 'then' ? () => new Promise(() => {}) : key === Symbol.toPrimitive ? () => '' : key === Symbol.iterator ? [][Symbol.iterator] : stub(),
  apply: () => stub(),
});

function render(screen: string) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../app/(tabs)/${screen}.tsx`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const routes: string[] = [];
  const go = (...args: any[]) => { routes.push(JSON.stringify(args)); };
  const exports: any = {};
  const element = (type: any, props: any) => ({ type, props });
  runInNewContext(compiled, { exports, console: { warn() {}, error() {} }, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' };
    if (name === 'react') return { useState: (initial: any) => [initial, () => {}], useCallback: (cb: any) => cb, useMemo: (cb: any) => cb(), useEffect: () => {} };
    if (name === 'expo-router') return { useLocalSearchParams: () => ({}), useFocusEffect: () => {}, router: { push: go, navigate: go, replace: go } };
    if (name === 'react-native') return { Text: 'Text', View: 'View', Linking: { openURL: go } };
    if (name.endsWith('/ui')) return { Button: 'Button', Row: 'Row', Sheet: 'Sheet', Screen: 'Screen', BottomSheet: 'BottomSheet' };
    if (name.endsWith('/nav')) return { openFrom: go };
    if (name.endsWith('/offers')) return realOffers;
    if (name.endsWith('/copy')) return realCopy;
    if (name.endsWith('/more')) return realMore;
    if (name.endsWith('/kit')) return { ...kits, KIT_SALES_ENABLED: true };
    if (name.endsWith('/bundleOffers')) return bundleOffers;
    if (name.endsWith('/previewSamples')) return { PREVIEW_ENABLED: false, loadSamples: async () => {} };
    if (name.endsWith('/start')) return { startModel: () => ({ returning: false, recent: [], summary: '' }) };
    if (name.endsWith('/prices')) return { usePrices: () => ({}), storePrices: async () => ({}) };
    if (name.endsWith('/theme')) return { type: {}, space: {}, color: {} };
    return stub();
  } });
  const flatten = (node: any): any[] => !node ? [] : Array.isArray(node) ? node.flatMap(flatten) : typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
  const nodes = flatten(exports.default());
  const words = (node: any) => [node.props?.label, node.props?.title, node.props?.sub, ...[node.props?.children].flat()].filter(v => typeof v === 'string');
  return { nodes, text: nodes.flatMap(words).join('\n'), routes, press: () => { for (const n of nodes) try { void n.props?.onPress?.(); } catch { /* a stubbed store call; routes are what count */ } } };
}

test('home and every paywall stay silent about buying on the website; the website-order unlock is in More only', () => {
  for (const screen of SCREENS) {
    const view = render(screen);
    assert.ok(view.nodes.filter(n => n.type === 'Button' || n.type === 'Row').length >= 2, `${screen}: rendered nothing to check`);
    assert.doesNotMatch(view.text, /approvalprep\.com|bought (it )?on|at no charge|app store.s price/i, `${screen} points a buyer at the website`);
    view.press();
    assert.ok(view.routes.length > 0, `${screen}: no button was pressed`);
    assert.ok(!view.routes.some(r => /"\/more"/.test(r)), `${screen} sends a buyer to the website-order unlock: ${view.routes.join(' ')}`);
    // Terms, Privacy and the credit-repair page open in app view only: no shop menu, no links onward.
    for (const r of view.routes.filter(r => /approvalprep\.com/.test(r))) assert.match(r, /approvalprep\.com\/api\/app-page\//, `${screen} opens a website page outside app view: ${r}`);
  }
});

test('More opens only app-view pages, and every page the app opens is one the live check reads', () => {
  for (const link of realMore.MORE_LINKS) assert.ok(new URL(link.url).pathname.startsWith('/api/app-page/'), `${link.label} opens outside app view`);
  const checked: string[] = appPagePaths();
  // The app-page Function serves exactly the pages the app opens.
  assert.deepEqual([...APP_PAGES].sort(), [...checked].sort());
  for (const url of [...realMore.MORE_LINKS.map(l => l.url), realMore.TERMS_URL, realMore.PRIVACY_URL, realMore.CREDIT_REPAIR_DEFENSE_URL]) {
    assert.ok(checked.includes(new URL(url).pathname.replace('/api/app-page', '')), `${url} is not in the live check's list`);
  }
});

// The served pages themselves. The site's shop menu (kit links) is what a normal page carries, so the
// reader must catch it; app view must remove it. APP_VIEW_ORIGIN (a deploy preview or production) runs
// the same reader over the real pages; after every deploy scripts/ops/post-deploy-live-check.mjs does.
test('the reader catches a page with the shop menu and passes the same page in app view', () => {
  const shop = '<header class="site-header"><nav><a href="/credit-letter-kit/">Credit Letter Kit</a></nav></header><main><p>Terms.</p><button>Buy the Credit Letter Kit — $19</button></main>';
  const problems = appViewProblems(shop);
  assert.ok(problems.some((p: string) => p.includes('/credit-letter-kit/')));
  assert.ok(problems.some((p: string) => p.startsWith('buy button')));
  assert.deepEqual(appViewProblems('<main><p>Terms. Questions: <a href="mailto:info@approvalprep.com">email us</a>.</p></main>'), []);
});

test('every page the app opens is served with no way to buy (APP_VIEW_ORIGIN)', { skip: !process.env.APP_VIEW_ORIGIN && 'runs against a deploy: set APP_VIEW_ORIGIN' }, async () => {
  const origin = process.env.APP_VIEW_ORIGIN!.replace(/\/+$/, '');
  const paths: string[] = appPagePaths();
  assert.ok(paths.length >= 6);
  for (const path of paths) {
    const response = await fetch(appViewUrl(origin, path));
    assert.equal(response.status, 200, path);
    assert.deepEqual(appViewProblems(await response.text()), [], path);
  }
});
