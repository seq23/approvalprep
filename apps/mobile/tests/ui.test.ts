import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Script } from 'node:vm';
import ts from 'typescript';
import React from 'react';

// Execute the real components with host primitives; native navigation is outside this unit.
const nativeProps: Record<string, any[]> = {};
const primitive = (name: string) => (props: any) => {
  (nativeProps[name] ??= []).push(props);
  return React.createElement('div', null, props.children);
};
const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server');
const source = readFileSync(resolve('src/ui.tsx'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const output = { exports: {} as any };
new Script(`(function(require,module,exports){${js}\n})`).runInThisContext()((id: string) => {
  if (id === 'react-native') return { ...Object.fromEntries(['Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(n => [n, primitive(n)])), StyleSheet: { create: (s: any) => s }, Platform: { OS: 'android' } };
  if (id === 'react-native-safe-area-context') return { SafeAreaView: primitive('SafeAreaView') };
  if (id === './nav') return { useBackKeys: () => {} };
  if (id.startsWith('./')) return require(resolve('src', id + '.ts'));
  return require(id);
}, output, output.exports);
const ui = output.exports;
const render = (Component: any, props: any) => { for (const key of Object.keys(nativeProps)) delete nativeProps[key]; return renderToStaticMarkup(React.createElement(Component, props)); };

test('buttons expose disabled state and a minimum 48 point target', () => {
  let calls = 0;
  render(ui.Button, { label: 'Save', onPress: () => calls++ });
  const p = nativeProps.Pressable[0];
  assert.ok(p.style({ pressed: false })[0].minHeight >= 48);
  p.onPress(); assert.equal(calls, 1);
  render(ui.Button, { label: 'Save', disabled: true, onPress: () => calls++ });
  assert.equal(nativeProps.Pressable[0].disabled, true);
  assert.equal(nativeProps.Pressable[0].accessibilityState.disabled, true);
  render(ui.Button, { label: 'Unavailable' });
  assert.equal(nativeProps.Pressable[0].disabled, true);
});
test('row has one action and fields keep their supplied value and editing callback', () => {
  let calls = 0;
  render(ui.Row, { title: 'A letter', sub: 'Draft', selected: true, onPress: () => calls++ });
  assert.equal(nativeProps.Pressable.length, 1);
  const row = nativeProps.Pressable[0];
  assert.ok(row.style.minHeight >= 48); row.onPress(); assert.equal(calls, 1);
  assert.equal(row.accessibilityState.selected, true);
  let edited = '';
  render(ui.Field, { label: 'Sent date', value: '2026-11-10', defaultHint: 'Today', onChangeText: (s: string) => edited = s });
  const input = nativeProps.TextInput[0];
  assert.equal(input.value, '2026-11-10');
  assert.ok(input.accessibilityLabelledBy);
  input.onChangeText('2026-11-11'); assert.equal(edited, '2026-11-11');
});
test('sheet system dismissal and close button use the same callback; disclosure remains', () => {
  let closed = 0;
  const html = render(ui.BottomSheet, { visible: true, title: 'Task', onClose: () => closed++, children: 'Content' });
  assert.equal(nativeProps.Modal[0].visible, true);
  nativeProps.Modal[0].onRequestClose();
  nativeProps.Pressable[0].onPress();
  assert.equal(closed, 2);
  assert.ok(html.includes(require(resolve('src/copy.ts')).SELF_HELP_LINE));
  render(ui.BottomSheet, { visible: false, title: 'Task', onClose: () => {} });
  assert.equal(nativeProps.Modal[0].visible, false);
});
test('application colours stay in the theme', () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(`${dir}/${f.name}`) : /\.tsx?$/.test(f.name) ? [`${dir}/${f.name}`] : []);
  for (const file of [...walk('src'), ...walk('app')].filter(f => f !== 'src/theme.ts')) assert.equal(/#[\da-f]{3,8}\b/i.test(readFileSync(file, 'utf8')), false, file);
});
