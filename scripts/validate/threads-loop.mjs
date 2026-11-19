#!/usr/bin/env node
// Threads @approvalprep daily loop (scripts/threads/threads_loop.mjs). Fails if:
// 1. the bank is not 60+ posts, an approved post is missing its approval, a post is 500+
//    characters, carries more than one tag, a linked post lacks the tagged link or the
//    self-help line, a new post uses a banned credit-repair tag, or a post with a price or
//    number has no source check (R-PRF-03) or checks a page outside its own sources;
// 2. any bank post trips the R-ADV-13 phrase check, or the check misses a known bad phrase
//    (safety: a hit hard-blocks the post at queue time);
// 3. slots are not 19:30 America/Chicago (CST and CDT), or the window is not 7 days;
// 4. (fixture tests/fixtures/threads/pricing_page.html) a post whose source no longer shows
//    its figure is queued instead of skipped with THREADS_SOURCE_CHANGED <url>;
// 5. after the bank runs out it does not recycle the oldest 60+ day evergreen post, puts two
//    Question posts on consecutive days, or overfills the organisation's limit;
// 6. end to end against a fake Buffer: no Threads channel is not NO_THREADS_CHANNEL, a missing
//    token is not SECRET_MISSING_BUFFER_APPROVALPREP_ACCESS_TOKEN, an empty queue does not get 7
//    customScheduled posts, a full one does not print the OUTPUT line, a low bank does not
//    print THREADS_BANK_LOW, a blocked post does not end THREADS_PHRASE_BLOCKED.
// Run by validate:all (registered HARD_FAIL in _repo_validation_registry.json). No network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LINK, SELF_HELP, figureOnPage, main, planRun, r13Hits, slotsAhead, slotUtc } from '../threads/threads_loop.mjs';

const bank = JSON.parse(fs.readFileSync('data/threads/posts.json', 'utf8'));
const banned = JSON.parse(fs.readFileSync('data/brand-social/hashtags.json', 'utf8')).banned;
const fixture = fs.readFileSync('tests/fixtures/threads/pricing_page.html', 'utf8');
const fails = [];
const check = async (name, fn) => { try { await fn(); } catch (e) { fails.push(`${name}: ${e.message.split('\n')[0]}`); } };
const SOURCES = /^https:\/\/(consumer\.ftc\.gov|www\.ftc\.gov|www\.consumerfinance\.gov|www\.annualcreditreport\.com|www\.creditsaint\.com|skybluecredit\.com|www\.thecreditpeople\.com)\//;

// 1-2. the bank
await check('bank size and ids', () => {
  assert.ok(bank.posts.length >= 60, `${bank.posts.length} posts`);
  assert.equal(new Set(bank.posts.map((p) => p.id)).size, bank.posts.length, 'duplicate id');
  assert.equal(bank.posts.filter((p) => p.approved).length, 14, 'the 14 approved posts');
  const linked = bank.posts.filter((p) => p.link).length / bank.posts.length;
  assert.ok(linked >= 0.2 && linked <= 0.3, `linked share ${linked}`);
});
for (const p of bank.posts) await check(p.id, () => {
  assert.ok(['Receipt', 'Myth or fact', 'Save this', 'Question'].includes(p.type), p.type);
  assert.ok(p.text.length < 500, `${p.text.length} characters`);
  assert.ok((p.text.match(/#\w+/g) ?? []).length <= 1, 'more than one tag');
  assert.deepEqual(r13Hits(p.text), [], 'R-ADV-13 wording');
  if (p.link) { assert.ok(p.text.includes('approvalprep.com/?utm_source=threads'), 'no tagged link'); assert.ok(p.text.includes(SELF_HELP), 'no self-help line'); }
  if (p.link && !p.approved) assert.ok(p.text.endsWith(SELF_HELP) && p.text.includes(LINK), 'a new linked post ends with the self-help line after the full link');
  for (const t of banned) assert.ok(!new RegExp(`${t}\\b`, 'i').test(p.text), `banned tag ${t}`);
  if (/\$\d|\d+(\.\d+)? (days?|years?|months?|million|billion)/i.test(p.text)) assert.ok(p.checks?.length, 'a number with no source check');
  for (const s of p.sources) assert.match(s, SOURCES, 'source outside the allowed list');
  for (const c of p.checks ?? []) { assert.ok(p.sources.includes(c.url), `check ${c.url} is not a listed source`); assert.ok(c.figure?.length >= 2); }
});
await check('R-ADV-13 check catches the banned phrases', () => {
  for (const bad of ['Ready for round 2?', 'Keep disputing until it is removed.', 'We raise your score.', 'We will fix your credit.', 'Boost your credit score fast', 'Guaranteed results', 'We remove negative items', 'Get them removed for good', 'Save this. #creditrepair', 'Check it. #CreditScore']) assert.ok(r13Hits(bad).length, bad);
  assert.equal(r13Hits('No one can legally remove accurate, current information.').length, 0);
});

// 3. slots
await check('slots are 19:30 Central', () => {
  assert.equal(slotUtc('2026-11-18', '19:30'), '2026-11-19T01:30:00.000Z');
  assert.equal(slotUtc('2027-04-01', '19:30'), '2027-04-02T00:30:00.000Z');
  const s = slotsAhead(Date.parse('2026-11-18T20:00:00Z'), bank);
  assert.equal(s.length, 7); assert.equal(s[0].date, '2026-11-18'); assert.equal(s[6].date, '2026-11-24');
  assert.equal(slotsAhead(Date.parse('2026-11-19T01:20:00Z'), bank)[0].date, '2026-11-19', 'a slot under 15 minutes away is skipped');
});

// 4-5. plan, with the fixture page
const post = (id, type, extra = {}) => ({ id, type, link: false, evergreen: true, text: `${type} ${id}`, sources: [], checks: [], ...extra });
const mini = (posts) => ({ slot_time_ct: '19:30', days_ahead: 7, recycle_after_days: 60, bank_low_below: 14, posts });
const fetchFixture = async (url) => { if (url.includes('gone')) return '<p>Prices changed</p>'; return fixture; };
const NOW = Date.parse('2026-11-18T14:00:00Z');
await check('figure check reads split markup and curly quotes', () => {
  assert.ok(figureOnPage(fixture, '$79.00')); assert.ok(figureOnPage(fixture, "There's no cost to place or lift")); assert.ok(!figureOnPage(fixture, '$119'));
});
await check('a changed source skips the post with THREADS_SOURCE_CHANGED (fixture)', async () => {
  const b = mini([
    post('a', 'Receipt', { sources: ['https://x.test/gone'], checks: [{ url: 'https://x.test/gone', figure: '$79.00' }] }),
    post('b', 'Receipt', { sources: ['https://x.test/ok'], checks: [{ url: 'https://x.test/ok', figure: '$79.00' }] }),
    ...['c', 'd', 'e', 'f', 'g', 'h'].map((i) => post(i, 'Save this')),
  ]);
  const r = await planRun({ bank: b, ledger: { posts: {} }, pending: [], now: NOW, orgRoom: 10, fetchText: fetchFixture });
  assert.equal(r.picks[0].post.id, 'b');
  assert.ok(!r.picks.some((p) => p.post.id === 'a'));
  assert.ok(r.notes.some((n) => n.startsWith('THREADS_SOURCE_CHANGED https://x.test/gone')), JSON.stringify(r.notes));
});
await check('recycles the oldest 60+ day evergreen post, never Question twice in a row', async () => {
  const day = (n) => new Date(NOW - n * 86_400_000).toISOString();
  const b = mini([post('q1', 'Question'), post('q2', 'Question'), post('s1', 'Save this'), post('s2', 'Save this'), post('m1', 'Myth or fact'), post('m2', 'Myth or fact'), post('r1', 'Receipt', { evergreen: false }), post('s3', 'Save this')]);
  const ledger = { posts: { q1: { runs: [{ due_at: day(90) }] }, q2: { runs: [{ due_at: day(89) }] }, s1: { runs: [{ due_at: day(88) }] }, s2: { runs: [{ due_at: day(70) }] }, m1: { runs: [{ due_at: day(65) }] }, m2: { runs: [{ due_at: day(62) }] }, r1: { runs: [{ due_at: day(95) }] }, s3: { runs: [{ due_at: day(10) }] } } };
  const r = await planRun({ bank: b, ledger, pending: [], now: NOW, orgRoom: 10, fetchText: fetchFixture });
  const ids = r.picks.map((p) => p.post.id);
  assert.equal(ids[0], 'q1'); assert.equal(ids[1], 's1', 'q2 would be a second Question in a row'); assert.equal(ids[2], 'q2');
  assert.ok(!ids.includes('r1'), 'a non-evergreen post was recycled');
  assert.ok(r.picks.every((p) => p.recycled));
  for (let i = 1; i < r.picks.length; i += 1) assert.ok(!(r.picks[i].post.type === 'Question' && r.picks[i - 1].post.type === 'Question'));
  assert.equal(r.picks.length, 7, 'recycling must keep all 7 slots filled');
});
await check('blocks an R-ADV-13 post and respects the limits', async () => {
  const b = mini([post('bad', 'Save this', { text: 'Ready for round 2? Keep disputing.' }), ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((i) => post(i, 'Save this'))]);
  const taken = [{ id: 'x', dueAt: slotsAhead(NOW, b)[0].dueAt }];
  const r = await planRun({ bank: b, ledger: { posts: {} }, pending: taken, now: NOW, orgRoom: 3, fetchText: fetchFixture });
  assert.equal(r.blocked.length, 1); assert.ok(!r.picks.some((p) => p.post.id === 'bad'));
  assert.equal(r.picks.length, 3, 'organisation limit'); assert.ok(!r.picks.some((p) => p.slot.date === slotsAhead(NOW, b)[0].date), 'a taken day was filled again');
});

// 6. end to end against a fake Buffer
function fakeBuffer({ channels, scheduled = [] }) {
  const made = [];
  const fetchImpl = async (_url, init) => {
    const { query, variables } = JSON.parse(init.body);
    let data;
    if (query.includes('account')) data = { account: { organizations: [{ id: 'org', limits: { scheduledPosts: 10 } }] } };
    else if (query.includes('channels')) data = { channels };
    else if (query.includes('createPost')) { made.push(variables.i); data = { createPost: { __typename: 'PostActionSuccess', post: { id: `p${made.length}`, dueAt: variables.i.dueAt } } }; }
    else if (query.includes('posts(')) data = { posts: { edges: query.includes('[scheduled]') ? scheduled.map((node) => ({ node })) : [] } };
    return { ok: true, status: 200, json: async () => ({ data }) };
  };
  return { fetchImpl, made };
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'threads-'));
const run = async (opts) => { const lines = []; const ledgerFile = path.join(tmp, `l${Math.random()}.json`); try { const r = await main({ now: NOW, env: { BUFFER_APPROVALPREP_ACCESS_TOKEN: 't' }, fetchText: fetchFixture, log: (l) => lines.push(l), ledgerFile, ...opts }); return { r, lines, ledgerFile }; } catch (e) { return { e, lines, ledgerFile }; } };
const threads = [{ id: 'ch', service: 'threads', name: 'approvalprep', isQueuePaused: false }];
await check('named stops', async () => {
  assert.equal((await run({ env: {} })).e?.code, 'SECRET_MISSING_BUFFER_APPROVALPREP_ACCESS_TOKEN');
  assert.equal((await run({ fetchImpl: fakeBuffer({ channels: [{ id: 'i', service: 'instagram', name: 'approvalprep' }] }).fetchImpl })).e?.code, 'NO_THREADS_CHANNEL');
});
await check('an empty queue gets 7 posts at 19:30 CT from the real bank', async () => {
  const fb = fakeBuffer({ channels: threads });
  const allFigures = `<p>${bank.posts.flatMap((p) => p.checks ?? []).map((c) => c.figure).join(' | ')}</p>`;
  const { r, e, lines, ledgerFile } = await run({ fetchImpl: fb.fetchImpl, fetchText: async () => allFigures });
  assert.ok(!e, e?.message);
  assert.equal(fb.made.length, 7);
  for (const i of fb.made) { assert.equal(i.mode, 'customScheduled'); assert.equal(i.metadata.threads.type, 'post'); assert.equal(i.channelId, 'ch'); assert.match(new Date(i.dueAt).toLocaleString('en-US', { timeZone: 'America/Chicago' }), /7:30:00 PM/); }
  assert.equal(fb.made[0].text, bank.posts[0].text);
  assert.ok(lines.includes(`OUTPUT: queued 7, scheduled ahead 7, bank unposted ${bank.posts.length - 7}, recycled 0`), lines.join(' | '));
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(ledgerFile, 'utf8')).posts).length, 7);
  assert.equal(r.queued, 7);
});
await check('a full week queues nothing and still reports', async () => {
  const scheduled = slotsAhead(NOW, bank).map((s, i) => ({ id: `s${i}`, channelId: 'ch', dueAt: s.dueAt }));
  const { e, lines } = await run({ fetchImpl: fakeBuffer({ channels: threads, scheduled }).fetchImpl });
  assert.ok(!e, e?.message);
  assert.ok(lines.some((l) => l.startsWith('OUTPUT: queued 0, scheduled ahead 7,')), lines.join(' | '));
});
await check('a low bank is a note, a blocked post is red', async () => {
  const small = path.join(tmp, 'bank.json');
  fs.writeFileSync(small, JSON.stringify(mini([post('bad', 'Save this', { text: 'Round 2 starts now' }), ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((i) => post(i, 'Save this'))])));
  const { e, lines } = await run({ bankFile: small, fetchImpl: fakeBuffer({ channels: threads }).fetchImpl });
  assert.ok(lines.some((l) => l.startsWith('NAMED NOTE THREADS_BANK_LOW 2 unposted')), lines.join(' | '));
  assert.equal(e?.code, 'THREADS_PHRASE_BLOCKED');
});
fs.rmSync(tmp, { recursive: true, force: true });

if (fails.length) { console.error(`[validate:threads-loop] FAIL\n- ${fails.join('\n- ')}`); process.exit(1); }
console.log(`[validate:threads-loop] OK - ${bank.posts.length} posts, R-ADV-13 clean, sources checked, loop and stops proven`);
