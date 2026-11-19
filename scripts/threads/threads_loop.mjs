// The daily ApprovalPrep Threads job (.github/workflows/threads-posts.yml): one post a day at
// 19:30 America/Chicago on Threads @approvalprep, through ApprovalPrep's own free Buffer
// (BUFFER_APPROVALPREP_ACCESS_TOKEN). The channel is found at run time by service "threads" AND
// name THREADS_CHANNEL_NAME: the same organisation also holds the Peace Be Still Threads channel,
// so a match on service alone could post here to the wrong account (fix 18 Nov 2026). Her yes 18 Nov 2026: "yes to threads post for approval prep - but u
// need to come up with a loop so it can not be interrupted after day 14 and a plan".
//
// Every run keeps the next 6 evening slots filled (customScheduled, dueAt 19:30 CT; bank
// days_ahead), within the organisation's scheduled-post limit (10 on the free plan), which it
// shares with Instagram @approvalprep (moved into this Buffer 18 Nov 2026; weekly Monday batch
// of 3, scripts/brand_social/queue_posts.mjs): Threads never takes the room Instagram still
// needs (threadsRoom), so 6 + 3 never pass 10. Neither job ever deletes the other's posts. Posts come from the bank
// data/threads/posts.json, in order; each run is recorded in data/threads/posted.json.
//
// Uninterruptible past the bank:
//   - recycling: once every bank post has gone out, the slot takes the oldest-posted evergreen
//     post that has not run in 60+ days (if none is 60 days old, the oldest one anyway, with
//     NAMED NOTE THREADS_RECYCLE_UNDER_60); never two Question posts on consecutive days;
//   - NAMED NOTE THREADS_BANK_LOW when fewer than 14 unposted remain (a note, never red:
//     recycling keeps posting; the Wednesday Spry Labs line repeats it);
//   - before queuing a post with a price, number or company claim, each of its `checks` is
//     fetched and the exact figure must still be on the page; otherwise the post is skipped
//     for this run with NAMED NOTE THREADS_SOURCE_CHANGED <url> and the next one is used;
//   - the R-ADV-13 phrase and banned-tag check runs on every post at queue time; a hit hard-blocks the post
//     and the run ends red with NAMED STOP THREADS_PHRASE_BLOCKED after the others are queued.
//
// Rule 0: every run prints `OUTPUT: queued N, scheduled ahead M, bank unposted K, recycled R`.
// Zero queued with fewer than days_ahead ahead and no named note is NAMED STOP THREADS_NOTHING_QUEUED.
// Other named stops (red): SECRET_MISSING_BUFFER_APPROVALPREP_ACCESS_TOKEN, NO_THREADS_CHANNEL,
// AMBIGUOUS_THREADS_CHANNEL,
// THREADS_QUEUE_PAUSED, and the Buffer client's BUFFER_TOKEN_REFUSED / BUFFER_READ_FAILED /
// BUFFER_POST_REFUSED.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NamedStop, bufferClient, createPost, pendingPosts } from '../brand_social/buffer_queue.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BANK_FILE = path.join(ROOT, 'data', 'threads', 'posts.json');
export const LEDGER_FILE = path.join(ROOT, 'data', 'threads', 'posted.json');
export const TOKEN = 'BUFFER_APPROVALPREP_ACCESS_TOKEN';
const BRAND_PLAN = path.join(ROOT, 'data', 'brand-social', 'plan.json');

/** Room Threads may take: the organisation's room less what Instagram's weekly batch still needs. */
export function threadsRoom({ orgLimit, orgPending, igPending, igMax }) {
  return Math.max(0, orgLimit - orgPending - Math.max(0, igMax - igPending));
}
/** The Buffer channel name of Threads @approvalprep. Never match on service alone. */
export const THREADS_CHANNEL_NAME = 'approvalprep';
export const LINK = 'https://approvalprep.com/?utm_source=threads';
export const SELF_HELP = 'Self-help templates, not legal advice.';
const TZ = 'America/Chicago';
const DAY = 86_400_000;

/** R-ADV-13 (risk brain; ApprovalPrep defense record): words that promise an outcome or sound like paid credit repair. */
export const R13_PATTERNS = [
  /\bround\s*(2|two)\b/i,
  /\bkeep disputing\b/i,
  /\buntil (it is|it's|they are|they're|its) (removed|deleted|gone)\b/i,
  /\b(raise|boost|increase|improve|bump)s?\s+(up\s+)?(your|my|a|the)\s+(credit\s+)?scores?\b/i,
  /\b(fix|repair|restore|clean up)\s+(your|my)\s+credit\b/i,
  /\b(we|we'll|we will|approvalprep)\s+(can\s+|will\s+)?(fix|repair|remove|delete|erase|raise|boost|improve|dispute)\b/i,
  /\bremove negative items\b/i,
  /\b(get|have)\s+(it|them|items?|negatives?)\s+(removed|deleted)\b/i,
  /\bguarantee[ds]?\b/i,
  /\bpay[- ]for[- ]delete\b/i,
  /\bwe (send|mail|file) (it|the letter|your dispute|the dispute) for you\b/i,
];

// The banned credit-repair tags are the Instagram job's list (data/brand-social/hashtags.json `banned`):
// #creditrepair, #creditscore and the rest are blocked on Threads the same way (her call 18 Nov 2026).
const BANNED_TAGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'brand-social', 'hashtags.json'), 'utf8')).banned.map((t) => t.toLowerCase());

export function r13Hits(text) {
  const tags = (text.match(/#[A-Za-z0-9_]+/g) ?? []).filter((t) => BANNED_TAGS.includes(t.toLowerCase()));
  return [...R13_PATTERNS.filter((re) => re.test(text)).map((re) => text.match(re)[0]), ...tags];
}

// ---- time: slots at 19:30 America/Chicago -------------------------------------------------
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function ctParts(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export const ctDate = (iso) => ctParts(Date.parse(iso)).date;

/** The UTC instant of hh:mm Central on a Central calendar date (CST or CDT). */
export function slotUtc(date, hhmm) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  for (const off of [5, 6]) {
    const ms = Date.UTC(y, m - 1, d, h + off, mi);
    const p = ctParts(ms);
    if (p.date === date && p.time === hhmm) return new Date(ms).toISOString();
  }
  throw new Error(`no ${hhmm} on ${date} in ${TZ}`);
}

/** The next `days` evening slots, starting today if today's is still 15+ minutes away. */
export function slotsAhead(now, { slot_time_ct: hhmm = '19:30', days_ahead: days = 7 } = {}) {
  const today = ctParts(now).date;
  const [y, m, d] = today.split('-').map(Number);
  const start = Date.parse(slotUtc(today, hhmm)) - now >= 15 * 60_000 ? 0 : 1;
  const out = [];
  for (let i = start; out.length < days; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, d + i, 12)).toISOString().slice(0, 10);
    out.push({ date, dueAt: slotUtc(date, hhmm) });
  }
  return out;
}

// ---- sources ------------------------------------------------------------------------------
export function pageText(html) {
  const decoded = String(html)
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&#36;|&dollar;/g, '$').replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;|&#x2019;|’/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”]/g, '"');
  return decoded.replace(/\s+/g, ' ');
}
const squash = (s) => String(s).replace(/[’]/g, "'").replace(/\s+/g, ' ');

/** True when the exact figure is still on the page (text view, or raw page for prices split by markup). */
export function figureOnPage(html, figure) {
  const f = squash(figure);
  return pageText(html).includes(f) || squash(html).includes(f);
}

export async function defaultFetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ApprovalPrepSourceCheck/1.0; +https://approvalprep.com)' }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** First failing check of a post, or null. Pages are fetched once per run (cache). */
export async function sourceProblem(post, fetchText, cache) {
  for (const c of post.checks ?? []) {
    if (!cache.has(c.url)) cache.set(c.url, fetchText(c.url).then((t) => ({ t }), (e) => ({ e: e.message })));
    const got = await cache.get(c.url);
    if (got.e) return { url: c.url, why: `unreadable (${got.e})` };
    if (!figureOnPage(got.t, c.figure)) return { url: c.url, why: `"${c.figure}" no longer on the page` };
  }
  return null;
}

// ---- the plan for one run -----------------------------------------------------------------
const lastRun = (ledger, id) => (ledger.posts?.[id]?.runs ?? []).map((r) => r.due_at).sort().at(-1) ?? null;
export const unposted = (bank, ledger) => bank.posts.filter((p) => !(ledger.posts?.[p.id]?.runs ?? []).length);

/**
 * Which post goes in each empty slot. Pure apart from fetchText.
 * pending: the channel's waiting Buffer posts ({ id, dueAt }); orgRoom: how many more the organisation takes.
 */
export async function planRun({ bank, ledger, pending, now, orgRoom, fetchText }) {
  const cfg = bank;
  const taken = new Set(pending.filter((p) => p.dueAt).map((p) => ctDate(p.dueAt)));
  const slots = slotsAhead(now, cfg).filter((s) => !taken.has(s.date)).slice(0, Math.max(0, orgRoom));
  const typeOn = new Map();
  const byId = new Map(bank.posts.map((p) => [p.id, p]));
  for (const [id, v] of Object.entries(ledger.posts ?? {})) for (const r of v.runs ?? []) if (byId.has(id)) typeOn.set(ctDate(r.due_at), byId.get(id).type);
  const notes = [];
  const blocked = [];
  const bad = new Set();
  const cache = new Map();
  const used = new Set();
  const picks = [];
  const gapMs = (cfg.recycle_after_days ?? 60) * DAY;

  async function usable(post, slot) {
    if (used.has(post.id) || bad.has(post.id)) return false;
    const prev = new Date(Date.parse(`${slot.date}T12:00:00Z`) - DAY).toISOString().slice(0, 10);
    if (post.type === 'Question' && typeOn.get(prev) === 'Question') return false;
    const hits = r13Hits(post.text);
    if (hits.length) { bad.add(post.id); blocked.push(`${post.id} (${hits.join(', ')})`); return false; }
    const problem = await sourceProblem(post, fetchText, cache);
    if (problem) { bad.add(post.id); notes.push(`THREADS_SOURCE_CHANGED ${problem.url} - ${post.id} skipped: ${problem.why}`); return false; }
    return true;
  }

  for (const slot of slots) {
    const fresh = unposted(bank, ledger);
    const evergreen = bank.posts.filter((p) => p.evergreen && lastRun(ledger, p.id)).sort((a, b) => lastRun(ledger, a.id).localeCompare(lastRun(ledger, b.id)));
    const due = evergreen.filter((p) => Date.parse(slot.dueAt) - Date.parse(lastRun(ledger, p.id)) >= gapMs);
    let pick = null;
    let recycled = false;
    for (const p of fresh) if (await usable(p, slot)) { pick = p; break; }
    if (!pick) for (const p of due) if (await usable(p, slot)) { pick = p; recycled = true; break; }
    if (!pick) {
      for (const p of evergreen) if (!due.includes(p) && await usable(p, slot)) { pick = p; recycled = true; break; }
      if (pick) notes.push(`THREADS_RECYCLE_UNDER_60 ${pick.id} on ${slot.date}: no evergreen post was 60+ days old; add posts to data/threads/posts.json`);
    }
    if (!pick) { notes.push(`THREADS_NO_POST_FOR ${slot.date}: every post was skipped, blocked or used this run`); continue; }
    used.add(pick.id);
    typeOn.set(slot.date, pick.type);
    picks.push({ post: pick, slot, recycled });
  }
  return { picks, notes, blocked, slotsOpen: slots.length };
}

/** The one Threads channel named `name`; zero or several is a named stop, never a guess. */
export function pickThreadsChannel(channels, name = THREADS_CHANNEL_NAME) {
  const hits = (channels ?? []).filter((c) => c.service === 'threads' && String(c.name ?? '').toLowerCase() === name.toLowerCase());
  if (!hits.length) throw new NamedStop('NO_THREADS_CHANNEL', `the ApprovalPrep Buffer organisation has no Threads channel named ${name}: reconnect Threads @${name} in Buffer`);
  if (hits.length > 1) throw new NamedStop('AMBIGUOUS_THREADS_CHANNEL', `${hits.length} Threads channels are named ${name} in Buffer; refusing to guess which one to post to`);
  return hits[0];
}

/** The createPost input: a plain Threads text post at the slot's exact time. */
export function threadsInput(post, channelId, dueAt) {
  return { channelId, text: post.text, assets: [], metadata: { threads: { type: 'post' } }, mode: 'customScheduled', dueAt, schedulingType: 'automatic', needsApproval: false, source: 'threads-loop' };
}

const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
export async function main({ now = Date.now(), env = process.env, fetchImpl = fetch, fetchText = defaultFetchText, log = console.log, bankFile = BANK_FILE, ledgerFile = LEDGER_FILE } = {}) {
  const writeLedger = (l) => fs.writeFileSync(ledgerFile, `${JSON.stringify(l, null, 2)}\n`);
  const bank = readJson(bankFile, null);
  const ledger = readJson(ledgerFile, { posts: {} });
  ledger.posts ??= {};
  const token = env[TOKEN];
  if (!token) throw new NamedStop(`SECRET_MISSING_${TOKEN}`, `${TOKEN} is not set (repository secret; from the Boss OS vault)`);
  const call = bufferClient(token, fetchImpl, TOKEN);
  const org = (await call('{ account { organizations { id limits { scheduledPosts } } } }'))?.account?.organizations?.[0];
  if (!org) throw new NamedStop('BUFFER_READ_FAILED', 'the token sees no Buffer organisation');
  const { channels } = await call('query($o:OrganizationId!){ channels(input:{organizationId:$o}){ id service name isQueuePaused } }', { o: org.id });
  const ch = pickThreadsChannel(channels);
  if (ch.isQueuePaused) throw new NamedStop('THREADS_QUEUE_PAUSED', 'the Threads queue is paused in Buffer, so nothing scheduled goes out: unpause it');
  const all = await pendingPosts(call, org.id, 'id channelId dueAt');
  const pending = all.filter((p) => p.channelId === ch.id);
  const notes = [];

  // A run whose Buffer post vanished before its time (deleted or failed) is forgotten, so the post can go again.
  const ids = new Set(pending.map((p) => p.id));
  for (const [id, v] of Object.entries(ledger.posts)) {
    const keep = (v.runs ?? []).filter((r) => Date.parse(r.due_at) <= now || ids.has(r.buffer_id));
    if (keep.length !== (v.runs ?? []).length) { notes.push(`THREADS_POST_VANISHED ${id}: its Buffer post is gone before its time; it will be queued again`); v.runs = keep; }
  }

  const ig = readJson(BRAND_PLAN, { channels: {} }).channels?.instagram;
  const igMax = readJson(BRAND_PLAN, {}).per_channel_queue_max ?? 3;
  const igCh = ig && channels.find((c) => c.service === ig.service && c.name === ig.name);
  const igPending = igCh ? all.filter((p) => p.channelId === igCh.id).length : 0;
  const orgLimit = Number(org.limits?.scheduledPosts ?? 10);
  const orgRoom = threadsRoom({ orgLimit, orgPending: all.length, igPending, igMax });
  const plan = await planRun({ bank, ledger, pending, now, orgRoom, fetchText });
  notes.push(...plan.notes);
  let queued = 0;
  let recycled = 0;
  for (const { post, slot, recycled: re } of plan.picks) {
    const made = await createPost(call, threadsInput(post, ch.id, slot.dueAt));
    const runs = ledger.posts[post.id]?.runs ?? [];
    ledger.posts[post.id] = { runs: [...runs, { buffer_id: made.id, due_at: made.dueAt ?? slot.dueAt, queued_at: new Date(now).toISOString(), recycled: re }] };
    writeLedger(ledger);
    queued += 1;
    if (re) recycled += 1;
    log(`queued ${post.id} (${post.type}${re ? ', recycled' : ''}) for ${slot.date} 19:30 CT`);
  }
  if (!plan.picks.length) writeLedger(ledger);
  const ahead = pending.filter((p) => p.dueAt && Date.parse(p.dueAt) > now).length + queued;
  const left = unposted(bank, ledger).length;
  if (left < (bank.bank_low_below ?? 14)) notes.push(`THREADS_BANK_LOW ${left} unposted left in data/threads/posts.json; recycling keeps posting, add new approved posts`);
  for (const n of notes) log(`NAMED NOTE ${n}`);
  const output = `OUTPUT: queued ${queued}, scheduled ahead ${ahead}, bank unposted ${left}, recycled ${recycled}; Buffer split: Threads up to ${bank.days_ahead ?? 7}, Instagram ${igPending} waiting + ${Math.max(0, igMax - igPending)} kept free (up to ${igMax}), organisation ${all.length + queued} of ${orgLimit}`;
  log(output);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### Threads @approvalprep\n\n- ${output}\n${notes.map((n) => `- NAMED NOTE ${n}`).join('\n')}\n`);
  if (plan.blocked.length) throw new NamedStop('THREADS_PHRASE_BLOCKED', `R-ADV-13 wording in ${plan.blocked.join('; ')}: rewrite or delete it in data/threads/posts.json (the others were queued)`);
  if (!queued && ahead < (bank.days_ahead ?? 7) && !notes.length) throw new NamedStop('THREADS_NOTHING_QUEUED', `0 queued and only ${ahead} scheduled ahead, with no reason found`);
  return { queued, ahead, left, recycled, notes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    if (e instanceof NamedStop) { console.error(`NAMED STOP: ${e.message}`); process.exit(1); }
    throw e;
  });
}
