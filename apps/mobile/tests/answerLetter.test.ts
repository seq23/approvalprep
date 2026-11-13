import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANSWER_CHOICES, answerChoices, answerOffer, saveBureauAnswer } from '../src/answerLetter';
import { newDispute } from '../src/letterQuestions';
import { myLetters } from '../src/myLetters';
import { letterStorage } from '../src/letterStorage';
import { DatabaseSync } from 'node:sqlite';
const sent = { ...newDispute('answer'), status: 'sent' as const, sentDate: '2026-11-06', reminderDate: '2026-12-06' };
const now = new Date('2026-12-07T12:00:00');
test('all three outcomes persist, cancel reminders, and can be changed without moving the saved letter', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await letterStorage({
    async execAsync(sql) { db.exec(sql); },
    async runAsync(sql, ...params) { return db.prepare(sql).run(...params); },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) { return db.prepare(sql).all(...params) as T[]; },
  });
  try {
    await store.create(sent);
    const cancelled: string[] = [];
    const deps = { update: store.update, reminders: { async cancel(id: string) { cancelled.push(id); } } };
    for (const choice of ANSWER_CHOICES) {
      const previous = (await store.get(sent.id))!;
      await saveBureauAnswer(previous, choice.value, '2026-12-06', deps, now);
      const saved = (await store.get(sent.id))!;
      assert.equal(saved.answerNote, choice.value);
      assert.equal(saved.reminderDate, null);
      assert.equal(saved.answeredAt, now.toISOString());
      assert.equal(saved.status, choice.value === 'No answer' ? 'sent' : 'answered');
      assert.equal(saved.answers.answerArrivedOn, choice.value === 'No answer' ? '' : '2026-12-06');
      assert.equal(myLetters([saved], true, now).rows[0].needsAnswer, choice.value === 'No answer');
    }
    assert.deepEqual(cancelled, Array(3).fill('approvalprep-letter-answer'));
    let writes = 0;
    const failing = { update: async () => { writes++; }, reminders: { cancel: async () => { throw Error('cancel failed'); } } };
    await assert.rejects(saveBureauAnswer(sent, 'Corrected', '', failing, now));
    assert.equal(writes, 0);
    for (const arrived of ['2026-12-08', '2026-11-05', '2026-02-30']) await assert.rejects(saveBureauAnswer(sent, 'Verified', arrived, deps, now));
    await assert.rejects(saveBureauAnswer(newDispute('draft'), 'Verified', '', deps, now));
    const early = await saveBureauAnswer(sent, 'Corrected', '', deps, new Date('2026-11-07T12:00:00'));
    assert.equal(early.status, 'answered');
  } finally { db.close(); }
});
test('day-30 content has three choices and only one non-recurring credit offer, hidden for buyers or disabled sales', () => {
  assert.deepEqual(ANSWER_CHOICES.map(row => row.value), ['Corrected', 'Verified', 'No answer']);
  assert.equal(answerOffer(false, true), 'ap_credit_kit');
  for (const [owned, enabled] of [[true, true], [true, false], [false, false]]) assert.equal(answerOffer(owned, enabled), null);
  const screen = readFileSync(new URL('../app/(tabs)/mine/answer.tsx', import.meta.url), 'utf8');
  const content = JSON.stringify(ANSWER_CHOICES) + screen;
  assert.doesNotMatch(content, /ap_explanation_kit|ap_complete_bundle|ap_bundle_upgrade|\$\d|round 2|next round|next letter|keep disputing|until it is removed|we follow up|subscription|per month|per year/i);
  assert.match(screen, /<Screen /); // Includes the mandatory self-help footer.
  assert.match(ANSWER_CHOICES[1].guidance.join(' '), /accurate item is not something to dispute again/);
  assert.match(readFileSync(new URL('../../../src/pages/the-bureau-answered.astro', import.meta.url), 'utf8'), /bureauAnswer\.accurate/);
});

test('answer screen starts unselected, renders all guidance without a checkout for buyers, and recovers from a stalled load', async () => {
  const { runInNewContext } = await import('node:vm');
  const ts = await import('typescript');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  let values: unknown[] = [];
  let effect: (() => void) | undefined;
  let timeout: (() => void) | undefined;
  let index = 0;
  const element = (type: unknown, props: any) => ({ type, props });
  const compiled = ts.transpileModule(readFileSync(new URL('../app/(tabs)/mine/answer.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: any = {};
  runInNewContext(compiled, { exports, Date, setTimeout: (cb: () => void) => { timeout = cb; }, clearTimeout: () => {}, require: (name: string) => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return { useCallback: (fn: unknown) => fn, useState: (initial: unknown) => { const slot = index++; if (!(slot in values)) values[slot] = initial; return [values[slot], (v: unknown) => { values[slot] = v; }]; } };
    if (name === 'expo-router') return { router: {}, useLocalSearchParams: () => ({ id: sent.id }), useFocusEffect: (fn: () => void) => { effect = fn; } };
    if (name === 'react-native') return { Text: 'Text' };
    if (name.endsWith('/ui')) return { Screen: 'Screen', Button: 'Button', Row: 'Row', Sheet: 'Sheet' };
    if (name.endsWith('/theme')) return { type: {} };
    if (name.endsWith('/MailingDateField')) return { MailingDateField: 'Date' };
    if (name.endsWith('/savedLetters')) return { savedLetters: () => new Promise(() => {}) };
    if (name.endsWith('/kitTemplates')) return { hasTrackingKit: async () => false };
    if (name.endsWith('/localReminders')) return { localReminders: {} };
    if (name.endsWith('/kit')) return { KIT_SALES_ENABLED: true };
    return require(name.replace('../../../src/', '../src/'));
  } });
  const render = () => { index = 0; return exports.default(); };
  const walk = (node: any): any[] => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  render(); effect!(); timeout!();
  assert.equal(values[4], 'error');
  assert.ok(walk(render()).some(node => node.props?.label === 'Try again ›'));
  values = [sent, null, '', false, 'ready', false, '', 0];
  let nodes = walk(render());
  assert.equal(nodes.filter(node => node.type === 'Row').length, 3);
  assert.equal(nodes.filter(node => node.type === 'Row' && node.props.selected).length, 0);
  assert.equal(nodes.find(node => node.props?.label === 'Save answer').props.disabled, true);
  assert.equal(nodes.filter(node => node.type === 'Sheet').length, 1);
  nodes.find(node => node.type === 'Row').props.onPress();
  assert.equal(values[1], 'Corrected');
  values[3] = true;
  nodes = walk(render());
  assert.equal(nodes.filter(node => node.type === 'Sheet').length, 0);
  assert.equal(nodes.find(node => node.props?.label === 'Save answer').props.disabled, false);
  for (const kind of ['goodwill', 'debt-validation', 'settlement-terms', 'explanation-credit']) {
    values = [{ ...sent, kind }, 'Other answer', '', false, 'ready', false, '', 0];
    nodes = walk(render());
    assert.equal(nodes.filter(node => node.type === 'Row').length, 2);
    assert.equal(nodes.filter(node => node.type === 'Row' && node.props.selected).length, 1);
    assert.equal(nodes.filter(node => node.type === 'Sheet').length, 0);
    assert.ok(!JSON.stringify(nodes).includes('Day 30'));
    assert.equal(nodes.find(node => node.props?.label === 'Save answer').props.disabled, false);
  }
});

test('non-bureau letters save neutral answers and reject bureau-only outcomes', async () => {
  const { EXPLANATION_LETTERS } = await import('../src/letters');
  for (const kind of ['goodwill', 'debt-validation', 'settlement-terms', ...EXPLANATION_LETTERS.map(row => row.kind)]) {
    const letter = { ...sent, kind };
    assert.deepEqual(answerChoices(kind).map(row => row.value), ['Other answer', 'No answer']);
    const writes: import('../src/letterStorage').SavedLetter[] = [];
    const cancelled: string[] = [];
    const deps = { update: async (value: import('../src/letterStorage').SavedLetter) => { writes.push(value); }, reminders: { cancel: async (id: string) => { cancelled.push(id); } } };
    const saved = await saveBureauAnswer(letter, 'Other answer', '2026-12-06', deps, now);
    assert.equal(saved.status, 'answered');
    assert.equal(saved.answerNote, 'Other answer');
    assert.equal(saved.answers.answerArrivedOn, '2026-12-06');
    assert.equal(saved.reminderDate, null);
    assert.equal(cancelled.length, 1);
    assert.deepEqual(writes, [saved]);
    await assert.rejects(saveBureauAnswer(letter, 'Corrected', '', deps, now));
    await assert.rejects(saveBureauAnswer(letter, 'Verified', '', deps, now));
    const waiting = await saveBureauAnswer(saved, 'No answer', '', deps, now);
    assert.equal(waiting.status, 'sent');
    assert.equal(waiting.answers.answerArrivedOn, '');
  }
});
