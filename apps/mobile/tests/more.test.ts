import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deletionController, MORE_LINKS } from '../src/more';
test('delete requires explicit confirmation, Keep preserves data, repeated taps delete once', async () => {
  let removed = 0; let finish!: () => void;
  const action = deletionController(async () => { removed++; await new Promise<void>(resolve => { finish = resolve; }); });
  assert.equal(await action.confirm(), false); assert.equal(removed, 0);
  action.request(); action.keep(); assert.equal(await action.confirm(), false); assert.equal(removed, 0);
  action.request(); const result = action.confirm();
  assert.equal(removed, 1); assert.equal(await action.confirm(), false);
  action.keep(); finish(); assert.equal(await result, true);
  assert.equal(await action.confirm(), false); assert.equal(removed, 1);
});
test('a failed deletion stays confirmable and can be retried', async () => {
  let calls = 0;
  const action = deletionController(async () => { if (++calls === 1) throw Error('storage failed'); });
  action.request(); await assert.rejects(action.confirm());
  assert.equal(await action.confirm(), true); assert.equal(calls, 2);
});
test('More links are distinct secure pages on our own site', () => {
  assert.equal(MORE_LINKS.length, 5);
  assert.equal(new Set(MORE_LINKS.map(l => l.url)).size, 5);
  for (const link of MORE_LINKS) { const url = new URL(link.url); assert.equal(url.protocol, 'https:'); assert.equal(url.host, 'approvalprep.com'); }
});
