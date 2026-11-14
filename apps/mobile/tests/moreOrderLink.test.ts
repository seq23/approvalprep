import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// The real More screen, run with a tiny hook store, so a message can be seen to stay or go as she types.
function mountMore(unlock: (link: string) => Promise<unknown>, lookup: (email: string) => Promise<string>) {
  const slots: unknown[] = [];
  let slot = 0;
  const element = (type: unknown, props: any) => ({ type, props });
  const source = readFileSync(new URL('../app/(tabs)/more/index.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: { default?: () => any } = {};
  const stub = new Proxy({}, { get: (_t, key) => key === '__esModule' ? false : typeof key === 'string' && /^[A-Z_]+$/.test(key) ? [] : () => ({}) });
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' };
    if (name === 'react') return {
      useState: (initial: unknown) => { const i = slot++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v: unknown) => { slots[i] = v; }]; },
      useMemo: (make: () => unknown) => make(),
    };
    if (name === 'react-native') return { Linking: {}, Text: 'Text', View: 'View' };
    if (name.endsWith('/ui')) return { Button: 'Button', Field: 'Field', Row: 'Row', Screen: 'Screen' };
    if (name.endsWith('/offers')) return { PAID_ONCE_LINE: '', PRODUCTS: [], offerTitle: () => '' };
    if (name.endsWith('/more')) return { MORE_LINKS: [], deletionController: () => ({}) };
    if (name.endsWith('/websiteUnlock')) return { unlockWebsiteOrder: unlock, emailWebsiteOrderLinks: lookup,
      websiteUnlockMessage: (r: any) => r && typeof r === 'object' && 'message' in r ? 'That does not look like an ApprovalPrep order link.' : 'Your kit is on this phone.' };
    return stub;
  } });
  const flat = (node: any): any[] => node == null || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flat) : [node, ...flat(node.props?.children)];
  const render = () => { slot = 0; return flat(exports.default!()); };
  const field = (label: string) => render().find(n => n.type === 'Field' && n.props.label === label)!.props;
  const button = (label: RegExp) => render().find(n => n.type === 'Button' && label.test(n.props.label))!.props;
  const alerts = () => render().filter(n => n.type === 'Text' && n.props.accessibilityRole === 'alert').map(n => n.props.children);
  return { field, button, alerts };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 5));

test('a wrong order link message goes away as soon as she edits the link, and the email answer goes when she edits the email', async () => {
  const screen = mountMore(async () => { throw Error('ORDER_LINK_INVALID'); }, async () => 'If that email bought a kit, the link is on its way.');
  screen.field('Your order link').onChangeText('not a link');
  screen.button(/Open my website kit/).onPress();
  await settle();
  assert.deepEqual(screen.alerts(), ['That does not look like an ApprovalPrep order link.']);
  screen.field('Your order link').onChangeText('https://approvalprep.com/download/abc');
  assert.deepEqual(screen.alerts(), [], 'the old error is gone once a new link is pasted');
  screen.field('Email you paid with').onChangeText('me@example.com');
  screen.button(/Email me my link/).onPress();
  await settle();
  assert.equal(screen.alerts().length, 1);
  screen.field('Email you paid with').onChangeText('me@example.org');
  assert.deepEqual(screen.alerts(), []);
  assert.equal(screen.field('Your order link').kind, 'url');
  assert.equal(screen.field('Email you paid with').kind, 'email');
});
