import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { dateInput, mailingDate } from '../src/sentLetter';

for (const platform of ['web', 'android', 'ios']) test(`${platform}: date selection preserves cancellation and rejects future dates`, () => {
  let open = false;
  const changes: string[] = [];
  const source = readFileSync(new URL(`../src/MailingDateField${platform === 'web' ? '.web' : ''}.tsx`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  const element = (type: unknown, props: any) => ({ type, props });
  runInNewContext(compiled, { exports, Date, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return { useState: () => [open, (v: boolean) => { open = v; }] };
    if (name === 'react-native') return { Platform: { OS: platform }, View: 'View', Text: 'Text' };
    if (name === '@react-native-community/datetimepicker') return { default: 'Picker' };
    if (name === './ui') return { Button: 'Button' };
    if (name === './theme') return { color: {}, space: {}, type: {} };
    if (name === './sentLetter') return { dateInput, mailingDate };
    if (name === './myLetters') return { showDate: dateInput };
    throw Error(`Unexpected import ${name}`);
  } });
  const render = (disabled = false) => exports.MailingDateField({ value: dateInput(), onChange: (v: string) => changes.push(v), disabled });
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (platform === 'web') {
    const input = render().props.children[1];
    assert.equal(input.props.type, 'date'); assert.equal(input.props.value, dateInput()); assert.equal(input.props.max, dateInput());
    for (const value of ['', '2026-02-30', dateInput(tomorrow)]) input.props.onChange({ currentTarget: { value } });
    assert.deepEqual(changes, []);
    input.props.onChange({ currentTarget: { value: dateInput(yesterday) } });
    assert.equal(render(true).props.children[1].props.disabled, true);
  } else {
    render().props.children[1].props.onPress(); assert.equal(open, true);
    const picker = render().props.children[2];
    assert.equal(dateInput(picker.props.maximumDate), dateInput());
    assert.equal(dateInput(picker.props.value), dateInput());
    picker.props.onChange({ type: 'dismissed' }, yesterday); assert.equal(open, false);
    picker.props.onChange({ type: 'set' }, tomorrow); assert.deepEqual(changes, []);
    picker.props.onChange({ type: 'set' }, yesterday);
    assert.equal(render(true).props.children[1].props.disabled, true);
  }
  assert.deepEqual(changes, [dateInput(yesterday)]);
});
