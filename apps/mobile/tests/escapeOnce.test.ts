import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as screens from '../src/screens';

// The Studio pushes one copy of /letters/studio per question. Every copy used to match the path and
// add its own Escape listener, so one Escape on question 2 went back three screens, to Home.
// Only the focused copy may listen.
test('one Escape is answered by the focused screen only', () => {
  const source = readFileSync(new URL('../src/nav.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const listeners: ((e: { key: string }) => void)[] = [];
  const backs: string[] = [];
  const mount = (focused: boolean) => {
    const exports: { useBackKeys?: (route: string) => void } = {};
    runInNewContext(compiled, { exports, require: (name: string) => {
      if (name === 'react') return { useEffect: (fn: () => void) => fn(), default: {} };
      if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
      if (name === 'react-native') return { BackHandler: { addEventListener: () => ({ remove: () => {} }) }, Platform: { OS: 'web' }, Pressable: 'Pressable', Text: 'Text' };
      if (name === 'expo-router') return {
        router: { canGoBack: () => true, back: () => backs.push('back'), navigate: () => backs.push('navigate'), replace: () => backs.push('replace') },
        useIsFocused: () => focused, useLocalSearchParams: () => ({}), usePathname: () => '/letters/studio', Stack: Object.assign(() => null, { Screen: () => null }),
      };
      if (name.endsWith('/theme')) return { color: {}, font: {}, type: {} };
      if (name.endsWith('/screens')) return screens;
      throw new Error(`Unexpected import: ${name}`);
    }, document: { addEventListener: (_: string, fn: (e: { key: string }) => void) => listeners.push(fn), removeEventListener: () => {} } });
    exports.useBackKeys!('/letters/studio');
  };
  // The chooser and question 1 sit under question 2; question 2 is on show.
  mount(false); mount(false); mount(true);
  assert.equal(listeners.length, 1, 'only the screen on show listens for Escape');
  listeners.forEach(fn => fn({ key: 'Escape' }));
  assert.deepEqual(backs, ['back'], 'one Escape goes back one screen');
});
