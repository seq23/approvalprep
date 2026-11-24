// ApprovalPrep's LinkedIn page poster (.github/workflows/linkedin-posts.yml). Her words 24 Nov 2026: "make
// sure noelle is in charge of linkedin also for the apps that have a linkedin page". Noelle (Boss OS, the
// Growth Director) writes and banks the posts in data/linkedin/posts.json; each passed a fresh no-tools
// review before it was banked. This job posts the next unposted one once each weekday (Central), as the
// ApprovalPrep page (urn:li:organization:147008522), through LinkedIn's own Posts API, and records it in
// data/linkedin/posted.json. Boss OS reads both files (noelle-reads.mjs readLinkedIn) for Noelle's queue.
//
// Access: posting as a page needs LinkedIn's Community Management API (w_organization_social). Until it is
// granted, posted.json says "access": "none", the workflow's post job is skipped, and Noelle's queue reads
// "not read: LinkedIn has not granted the page API yet", never a count that reads as scheduled.
//
// Every post: R-ADV-13 wording blocks it (the Threads job's list); the self-help line ends it (appended when
// the bank row lacks it). Rule 0: every run prints `OUTPUT: posted N, waiting M`. Named stops (red):
// SECRET_MISSING_LINKEDIN_APPROVALPREP_ACCESS_TOKEN, LINKEDIN_TOKEN_REFUSED, LINKEDIN_POST_REFUSED,
// LINKEDIN_BANK_EMPTY, LINKEDIN_PHRASE_BLOCKED.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { r13Hits } from '../threads/threads_loop.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BANK_FILE = path.join(ROOT, 'data', 'linkedin', 'posts.json');
export const LEDGER_FILE = path.join(ROOT, 'data', 'linkedin', 'posted.json');
export const TOKEN = 'LINKEDIN_APPROVALPREP_ACCESS_TOKEN';
export const AUTHOR = 'urn:li:organization:147008522';
export const SELF_HELP = 'Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.';
export const API_VERSION = '202510';
const TZ = 'America/Chicago';

export class NamedStop extends Error { constructor(code, why) { super(`${code} ${why}`); this.code = code; } }

export const ctDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
export const isWeekdayCT = (ms) => !['Sat', 'Sun'].includes(new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(new Date(ms)));

/** The post's words as published: the self-help line always ends it. */
export function finalText(text) {
  const t = String(text ?? '').trim();
  return t.endsWith(SELF_HELP) ? t : `${t}\n\n${SELF_HELP}`;
}
/** LinkedIn's commentary is "little text": its reserved characters must be escaped or the text is cut. */
export const littleText = (s) => String(s).replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);

/** What this run does, from the files alone. Pure. */
export function planRun({ bank, ledger, now }) {
  const done = new Set((ledger.posted ?? []).map((p) => p.id));
  const waiting = (bank.posts ?? []).filter((p) => p?.id && p.text && !done.has(p.id));
  if (!isWeekdayCT(now)) return { action: 'skip', why: 'weekend (posts go Monday to Friday)', waiting };
  if ((ledger.posted ?? []).some((p) => ctDate(Date.parse(p.at)) === ctDate(now))) return { action: 'skip', why: `already posted on ${ctDate(now)}`, waiting };
  const blocked = [];
  for (const p of waiting) {
    const hits = r13Hits(finalText(p.text));
    if (hits.length) { blocked.push(`${p.id} (${hits.join(', ')})`); continue; }
    return { action: 'post', post: p, text: finalText(p.text), waiting, blocked };
  }
  return { action: 'none', waiting, blocked };
}

/** The Posts API body for a plain text post as the page. */
export function postBody(text) {
  return { author: AUTHOR, commentary: littleText(text), visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false };
}

const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
export async function main({ now = Date.now(), env = process.env, fetchImpl = fetch, log = console.log, bankFile = BANK_FILE, ledgerFile = LEDGER_FILE } = {}) {
  const bank = readJson(bankFile, { posts: [] });
  const ledger = readJson(ledgerFile, { access: 'none', posted: [] });
  ledger.posted ??= [];
  if (ledger.access !== 'granted') { log(`NAMED STOP [LINKEDIN_NO_ACCESS] LinkedIn has not granted the page API; ${(bank.posts ?? []).length} posts banked, none can post`); return { posted: 0, skipped: 'no access' }; }
  const plan = planRun({ bank, ledger, now });
  let posted = 0;
  if (plan.action === 'post') {
    const token = env[TOKEN];
    if (!token) throw new NamedStop(`SECRET_MISSING_${TOKEN}`, `${TOKEN} is not set (repository secret; from the Boss OS vault)`);
    const res = await fetchImpl('https://api.linkedin.com/rest/posts', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'linkedin-version': API_VERSION, 'x-restli-protocol-version': '2.0.0' }, body: JSON.stringify(postBody(plan.text)), signal: AbortSignal.timeout(30_000) });
    if (res.status === 401 || res.status === 403) throw new NamedStop('LINKEDIN_TOKEN_REFUSED', `LinkedIn refused the token (${res.status}): renew it or re-grant w_organization_social`);
    if (res.status !== 201) throw new NamedStop('LINKEDIN_POST_REFUSED', `LinkedIn answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    ledger.posted.push({ id: plan.post.id, at: new Date(now).toISOString(), urn: res.headers.get('x-restli-id') ?? null });
    fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
    posted = 1;
    log(`posted ${plan.post.id} as the ApprovalPrep page`);
  } else if (plan.action === 'skip') log(`nothing to post: ${plan.why}`);
  const waiting = plan.waiting.length - posted;
  const output = `OUTPUT: posted ${posted}, waiting ${waiting}`;
  log(output);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### LinkedIn ApprovalPrep\n\n- ${output}\n`);
  if (plan.blocked?.length) throw new NamedStop('LINKEDIN_PHRASE_BLOCKED', `R-ADV-13 wording in ${plan.blocked.join('; ')}: rewrite or delete it in data/linkedin/posts.json`);
  if (plan.action === 'none') throw new NamedStop('LINKEDIN_BANK_EMPTY', 'no unposted post in data/linkedin/posts.json: Noelle banks the next ones');
  return { posted, waiting };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    if (e instanceof NamedStop) { console.error(`NAMED STOP: ${e.message}`); process.exit(1); }
    throw e;
  });
}
