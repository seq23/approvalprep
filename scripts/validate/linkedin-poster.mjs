#!/usr/bin/env node
// ApprovalPrep LinkedIn page poster (scripts/linkedin/linkedin_poster.mjs). Fails if:
// 1. the bank or record files are malformed, an id repeats, a banked post trips R-ADV-13 or runs past
//    LinkedIn's 3,000 characters with the self-help line, or the record's access is not none/granted;
// 2. the self-help line does not end every post exactly once, or LinkedIn's reserved characters are not escaped;
// 3. without access, a run posts or calls LinkedIn at all (NAMED STOP [LINKEDIN_NO_ACCESS], nothing written);
// 4. with access (fake LinkedIn): a weekday does not post the first unposted post once as the ApprovalPrep
//    page and record it; a second run the same day posts again; a weekend posts; a missing token is not
//    SECRET_MISSING_LINKEDIN_APPROVALPREP_ACCESS_TOKEN; a 401 is not LINKEDIN_TOKEN_REFUSED and records
//    anything; a 500 records anything; a blocked post is posted or not LINKEDIN_PHRASE_BLOCKED; an empty
//    bank is not LINKEDIN_BANK_EMPTY; any run lacks the OUTPUT line.
// Run by validate:all (HARD_FAIL). No network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AUTHOR, SELF_HELP, finalText, littleText, main, planRun } from '../linkedin/linkedin_poster.mjs';
import { r13Hits } from '../threads/threads_loop.mjs';

const bank = JSON.parse(fs.readFileSync('data/linkedin/posts.json', 'utf8'));
const record = JSON.parse(fs.readFileSync('data/linkedin/posted.json', 'utf8'));
const fails = [];
const check = async (name, fn) => { try { await fn(); } catch (e) { fails.push(`${name}: ${e.message.split('\n')[0]}`); } };
const MON = Date.parse('2026-11-30T16:00:00Z'); // Monday 10:00 CT
const SAT = Date.parse('2026-11-28T16:00:00Z');

await check('bank and record shape', () => {
  assert.ok(Array.isArray(bank.posts), 'posts list');
  assert.equal(new Set(bank.posts.map((p) => p.id)).size, bank.posts.length, 'duplicate id');
  for (const p of bank.posts) {
    assert.equal(r13Hits(finalText(p.text)).length, 0, `${p.id} R-ADV-13`);
    assert.ok(finalText(p.text).length <= 3000, `${p.id} over 3000`);
  }
  assert.ok(['none', 'granted'].includes(record.access), `access ${record.access}`);
  assert.ok(Array.isArray(record.posted), 'posted list');
});

await check('self-help line once, reserved characters escaped', () => {
  assert.ok(finalText('Hi').endsWith(SELF_HELP));
  assert.equal(finalText(`Hi\n\n${SELF_HELP}`).split(SELF_HELP).length, 2);
  assert.equal(littleText('a (b) #c @d'), 'a \\(b\\) \\#c \\@d');
});

function sandbox(posts, access = 'granted', posted = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'li-'));
  const bankFile = path.join(dir, 'posts.json'); const ledgerFile = path.join(dir, 'posted.json');
  fs.writeFileSync(bankFile, JSON.stringify({ days_ahead: 5, posts }));
  fs.writeFileSync(ledgerFile, JSON.stringify({ access, posted }));
  return { bankFile, ledgerFile, read: () => JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) };
}
function fakeLinkedIn(status = 201) {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return new Response(status === 201 ? '' : 'nope', { status, headers: { 'x-restli-id': 'urn:li:share:1' } }); };
  return { calls, fetchImpl };
}
const P = (id, text = `Post ${id}: one letter (at a time).`) => ({ id, text });
const env = { LINKEDIN_APPROVALPREP_ACCESS_TOKEN: 'test-token' };
const run = async (opts) => { const logs = []; let err = null; let res = null; try { res = await main({ ...opts, log: (l) => logs.push(l) }); } catch (e) { err = e; } return { logs, err, res }; };

await check('no access: nothing posted, nothing written, named stop', async () => {
  const s = sandbox([P('li1')], 'none'); const li = fakeLinkedIn();
  const before = fs.readFileSync(s.ledgerFile, 'utf8');
  const r = await run({ now: MON, env, fetchImpl: li.fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
  assert.equal(li.calls.length, 0); assert.equal(fs.readFileSync(s.ledgerFile, 'utf8'), before);
  assert.ok(r.logs.some((l) => l.includes('[LINKEDIN_NO_ACCESS]')));
});

await check('weekday: posts the first unposted once, as the page, and records it', async () => {
  const s = sandbox([P('li1'), P('li2'), P('li3')], 'granted', [{ id: 'li1', at: '2026-11-27T16:00:00Z' }]); const li = fakeLinkedIn();
  const r = await run({ now: MON, env, fetchImpl: li.fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
  assert.equal(r.err, null, r.err?.message);
  assert.equal(li.calls.length, 1);
  assert.equal(li.calls[0].url, 'https://api.linkedin.com/rest/posts');
  assert.equal(li.calls[0].body.author, AUTHOR);
  assert.ok(li.calls[0].body.commentary.startsWith('Post li2'));
  assert.ok(li.calls[0].body.commentary.endsWith(littleText(SELF_HELP)));
  assert.ok(li.calls[0].body.commentary.includes('letter \\(at a time\\)'), 'reserved characters sent unescaped');
  assert.deepEqual(s.read().posted.map((p) => p.id), ['li1', 'li2']);
  assert.ok(r.logs.includes('OUTPUT: posted 1, waiting 1'));
  const again = await run({ now: MON + 3_600_000, env, fetchImpl: li.fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
  assert.equal(li.calls.length, 1, 'posted twice in one day');
  assert.ok(again.logs.includes('OUTPUT: posted 0, waiting 1'));
});

await check('weekend posts nothing', async () => {
  const s = sandbox([P('li1')]); const li = fakeLinkedIn();
  const r = await run({ now: SAT, env, fetchImpl: li.fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
  assert.equal(li.calls.length, 0); assert.ok(r.logs.some((l) => l.startsWith('OUTPUT:')));
});

await check('missing token', async () => {
  const s = sandbox([P('li1')]);
  const r = await run({ now: MON, env: {}, fetchImpl: fakeLinkedIn().fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
  assert.equal(r.err?.code, 'SECRET_MISSING_LINKEDIN_APPROVALPREP_ACCESS_TOKEN');
});

for (const [status, code] of [[401, 'LINKEDIN_TOKEN_REFUSED'], [500, 'LINKEDIN_POST_REFUSED']]) {
  await check(`${status} records nothing`, async () => {
    const s = sandbox([P('li1')]);
    const r = await run({ now: MON, env, fetchImpl: fakeLinkedIn(status).fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
    assert.equal(r.err?.code, code); assert.deepEqual(s.read().posted, []);
  });
}

await check('blocked wording is skipped and ends red; the next clean post goes', async () => {
  const s = sandbox([P('li1', 'We will fix your credit fast.'), P('li2')]); const li = fakeLinkedIn();
  const r = await run({ now: MON, env, fetchImpl: li.fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
  assert.equal(r.err?.code, 'LINKEDIN_PHRASE_BLOCKED');
  assert.equal(li.calls.length, 1); assert.ok(li.calls[0].body.commentary.startsWith('Post li2'));
});

await check('empty bank is a named stop', async () => {
  const s = sandbox([]);
  const r = await run({ now: MON, env, fetchImpl: fakeLinkedIn().fetchImpl, bankFile: s.bankFile, ledgerFile: s.ledgerFile });
  assert.equal(r.err?.code, 'LINKEDIN_BANK_EMPTY');
  assert.equal(planRun({ bank: { posts: [] }, ledger: { posted: [] }, now: MON }).action, 'none');
});

if (fails.length) { console.error(`[linkedin-poster] FAIL\n- ${fails.join('\n- ')}`); process.exit(1); }
console.log('[linkedin-poster] PASS 10 checks');
