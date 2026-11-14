import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Script } from 'node:vm';
import ts from 'typescript';
import React from 'react';

// Sim retest (14 Nov 2026): fast typing saved "Capital One" for "Capital One, ending 4821",
// "Jordan" for "Jordan Avery", "03" for "03/14/1988" and "test-buyer" for "test-buyer@example.com".
// These tests run the real <Field> with a small hook runtime and a model of the phone's text box:
// the box holds its own text, every key reports the box's text, and a `value` the app sends to the
// box replaces what is in it (that is what a controlled field does). The parent re-renders late, the
// way a busy screen does, and Next reads whatever the parent last heard.
const require = createRequire(import.meta.url);
const TextInput = (props: any) => props;
function mountField() {
  let slots: any[] = []; let at = 0; let dirty = false; let effects: (() => void)[] = [];
  const hooks = {
    ...React,
    useId: () => 'label',
    useRef: (init: unknown) => { const k = at++; return (slots[k] ??= { current: init }); },
    useState: (init: unknown) => {
      const k = at++; const slot = (slots[k] ??= { v: init });
      return [slot.v, (u: any) => { const v = typeof u === 'function' ? u(slot.v) : u; if (!Object.is(v, slot.v)) { slot.v = v; dirty = true; } }];
    },
    useEffect: (fn: () => void, deps: unknown[]) => {
      const k = at++; const prev = slots[k];
      if (!prev || deps.some((d, j) => !Object.is(d, prev.deps[j]))) { slots[k] = { deps }; effects.push(fn); }
    },
  };
  const js = ts.transpileModule(readFileSync(resolve('src/ui.tsx'), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const output = { exports: {} as any };
  new Script(`(function(require,module,exports){${js}\n})`).runInThisContext()((id: string) => {
    if (id === 'react') return hooks;
    if (id === 'react-native') return { ...Object.fromEntries(['Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(n => [n, () => null])), TextInput, StyleSheet: { create: (s: any) => s }, Platform: { OS: 'ios' } };
    if (id === 'react-native-safe-area-context') return { SafeAreaView: () => null };
    if (id === './nav') return { useBackKeys: () => {} };
    if (id.startsWith('./')) return require(resolve('src', id + '.ts'));
    return require(id);
  }, output, output.exports);
  const find = (node: any): any => !node || typeof node !== 'object' ? null : node.type === TextInput ? node : [node.props?.children].flat(9).map(find).find(Boolean) ?? null;
  // The phone's box: its own text, re-created when the app gives it a new key.
  const phone = { text: '', key: undefined as unknown, props: {} as any };
  const render = (props: any) => {
    do {
      at = 0; dirty = false; effects = [];
      const input = find(output.exports.Field(props));
      if (input.key !== phone.key) { phone.key = input.key; phone.text = input.props.defaultValue ?? input.props.value ?? ''; }
      if (input.props.value !== undefined) phone.text = input.props.value;
      phone.props = input.props;
      for (const run of effects) run();
    } while (dirty);
  };
  return { render, phone };
}

/** A parent that saves each change and redraws its field `lag` keys late, then taps Next. */
function typeFast(words: string, opts: { lag?: number; dropAfter?: number; kind?: string } = {}) {
  const { render, phone } = mountField();
  let heard = '';
  const history: string[] = [''];
  const props = (value: string) => ({ label: 'Answer', kind: opts.kind, value, onChangeText: (v: string) => { heard = v; history.push(v); } });
  render(props(''));
  [...words].forEach((ch, n) => {
    phone.text += ch;
    if (opts.dropAfter === undefined || n < opts.dropAfter) phone.props.onChangeText(phone.text);
    render(props(history[Math.max(0, history.length - 1 - (opts.lag ?? 0))]));
  });
  return { get heard() { return heard; }, phone, render, props, blur: () => { phone.props.onEndEditing?.({ nativeEvent: { text: phone.text } }); phone.props.onBlur?.({ nativeEvent: { text: phone.text } }); render(props(heard)); } };
}

test('fast typing with the screen redrawing a few keys late saves every letter, and Next reads it at once', () => {
  for (const words of ['Capital One, ending 4821', 'Jordan Avery', '03/14/1988', 'test-buyer@example.com']) {
    for (const lag of [0, 1, 2, 3]) {
      const typed = typeFast(words, { lag });
      assert.equal(typed.phone.text, words, `the box shows what she typed (lag ${lag})`);
      assert.equal(typed.heard, words, `Next saves "${words}" whole (lag ${lag})`);
    }
  }
});

test('a change the phone never reported is still saved when she leaves the box', () => {
  const typed = typeFast('test-buyer@example.com', { dropAfter: 'test-buyer'.length });
  assert.equal(typed.heard, 'test-buyer');
  typed.blur();
  assert.equal(typed.heard, 'test-buyer@example.com');
});

test('a real new value from the screen (a cleared box, a reloaded draft) still replaces the box', () => {
  const typed = typeFast('https://approvalprep.com/d/abc', { lag: 2 });
  typed.render(typed.props(''));
  assert.equal(typed.phone.text, '');
  typed.render(typed.props('Reloaded answer'));
  assert.equal(typed.phone.text, 'Reloaded answer');
});

test('the SSN box passes on at most 4 digits as she types and shows them once she leaves it', () => {
  const typed = typeFast('12-34', { kind: 'ssn4', lag: 1 });
  assert.equal(typed.heard, '1234');
  typed.blur();
  assert.equal(typed.phone.text, '1234');
  assert.equal(typed.heard, '1234');
});
