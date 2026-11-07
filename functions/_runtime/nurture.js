// FREE SAMPLE -> EMAIL -> PAID, and the ONE post-purchase review ask (Growth playbook, 1 Nov 2026).
//
// A visitor types their own address to get the free Letter of Explanation sample
// (functions/api/sample.js). The sample goes out at once, then one email every 3 days, each
// about ONE paid kit with its live price from D1, and the series stops for good when the
// address buys, unsubscribes, or the steps run out.
//
// On a paid checkout the Stripe webhook hands the buyer's address to recordPurchase(), which
// never writes it anywhere: the purchase is remembered as a SHA-256 of the address
// (purchaser_hashes) so the series stops, and the ONE review ask is handed to Resend at once
// with scheduled_at about 3 days out. ApprovalPrep itself stores no buyer address
// (scripts/validate/data-privacy.mjs and scripts/validate/email-nurture.mjs hold that).
//
// Rules enforced here, not in a document: one-click unsubscribe (link + List-Unsubscribe-Post)
// and the mailing address in every email; an opted-out address is never emailed again; at
// most one email per 3 days per address; no fake urgency, no invented reviews, no incentive.
//
// .github/workflows/email-nurture.yml calls /api/nurture-run three times a day. Each run only sends
// what is due, and every send is claimed first-time-only in email_sends, so extra calls are
// harmless.

export const MAILING_ADDRESS = '2055 Lombard St #471024, San Francisco, CA 94147';
export const SITE = 'https://approvalprep.com';
export const DEFAULT_FROM = 'ApprovalPrep <hello@approvalprep.com>';
export const REPLY_TO = 'hello@approvalprep.com';
export const SAMPLE_URL = `${SITE}/samples/letter-of-explanation-sample.pdf`;
export const SAMPLE_SOURCE = 'sample:letter-of-explanation';
export const CONSENT_TEXT = 'Email me the free sample, then a few short emails about the ApprovalPrep kits (one every few days at most). I can unsubscribe at any time.';
// The free credit starter (her yes, 7 Nov 2026: "1A yes"): "Before you pay a credit repair
// company", a checklist + one dispute letter frame, shown on the page at once and emailed.
// Its own short series (cs0-cs2), chosen by the signup's source; self-help only (R-ADV-13).
export const STARTER_SOURCE = 'starter:credit-repair';
export const STARTER_CONSENT_TEXT = 'Email me the free starter, then a few short emails about the ApprovalPrep kits (one every few days at most). I can unsubscribe at any time.';
export const STARTER_CHECKLIST = [
  'Get your credit reports free at annualcreditreport.com, the only official site for free reports.',
  'Disputing an error is free: the credit bureau must investigate it at no charge (15 U.S.C. 1681i).',
  'A credit repair company may not charge you before the promised work is done (15 U.S.C. 1679b).',
  'Accurate information can lawfully stay on your report (most negative items for up to 7 years, 15 U.S.C. 1681c), whatever a company charges.',
  'Use the letter frame below for one error at a time, attach a copy of your proof, and keep a copy of what you send.'
];
export const STARTER_LETTER = [
  '[Your name] · [Your address] · [Date]',
  '[Credit bureau name and its dispute address]',
  'I am writing to dispute one item on my credit report. [Account name, last 4 digits] shows [what the report says]. This is wrong because [what is true]. A copy of [your proof] is attached.',
  'Please investigate this item and correct it or remove it if it cannot be verified, and send me the results.',
  '[Your signature]'
];
export const SELF_HELP_LINE = 'Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.';

/** The credit starter series: the starter at once, then two kit emails, one every 3 days. */
export function starterSequence(prices = {}) {
  return [
    {
      kind: 'cs0', subject: 'Your free credit repair starter',
      heading: 'Before you pay a credit repair company',
      paragraphs: [
        ...STARTER_CHECKLIST.map((line, i) => `${i + 1}. ${line}`),
        'Your dispute letter frame (fill in the brackets with your true facts):',
        ...STARTER_LETTER,
        `You fill it in and you send it yourself. ${SELF_HELP_LINE}`
      ],
      cta: { label: 'Draft it free in the Letter Studio', url: `${SITE}/letter-writing-studio/` }
    },
    {
      kind: 'cs1', subject: 'Every credit letter, ready to fill in',
      heading: `The Credit Letter Kit${price(prices, 'credit-letter-kit')}`,
      paragraphs: [
        'The starter covers one error. The Credit Letter Kit has templates for a dispute, a goodwill request, a debt validation request and a follow-up to the bureau, plus a credit report error checklist.',
        `Paid once, no monthly fee. You write and send them yourself; nothing is promised about what a bureau or creditor decides. ${SELF_HELP_LINE}`
      ],
      cta: { label: 'See the Credit Letter Kit', url: `${SITE}/credit-letter-kit/` }
    },
    {
      kind: 'cs2', subject: 'Every ApprovalPrep kit in one download',
      heading: `The Complete ApprovalPrep Bundle${price(prices, 'complete-approvalprep-bundle')}`,
      paragraphs: [
        'The bundle has every kit: credit letters, letters of explanation, income and employment, rental, loan prep, business funding and life admin.',
        'It suits anyone facing more than one application this year. This is the last email in this short series.'
      ],
      cta: { label: 'See the Complete Bundle', url: `${SITE}/pricing/` }
    }
  ];
}

/** Which series an address gets, from the source it signed up with. */
export const sequenceFor = (source, prices = {}) => (source === STARTER_SOURCE ? starterSequence(prices) : sequence(prices));

export const DAYS_BETWEEN = 3;
// Resend schedules at most 72 hours ahead; 71 hours keeps a margin.
export const REVIEW_ASK_AFTER_HOURS = 71;
const DAY = 86_400_000;
const MAX_PER_RUN = 50;

export const NURTURE_DDL = [
  `CREATE TABLE IF NOT EXISTS email_signups (email TEXT PRIMARY KEY, consent_text TEXT NOT NULL, source TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS email_sends (email_hash TEXT NOT NULL, kind TEXT NOT NULL, sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, provider_message_id TEXT, PRIMARY KEY (email_hash, kind))`,
  `CREATE TABLE IF NOT EXISTS email_optouts (email_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS purchaser_hashes (email_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
];

const price = (prices, slug) => (prices?.[slug] != null ? ` ($${(prices[slug] / 100).toFixed(0)})` : '');

/** The series. Step 0 delivers the sample; steps 1-4 each sell one kit. `prices` = slug -> cents from D1. */
export function sequence(prices = {}) {
  return [
    {
      kind: 'seq0', subject: 'Your free letter of explanation sample',
      heading: 'Here is your free sample.',
      paragraphs: [
        'Two pages from the Letter of Explanation Kit: the rules to read first and the fill-in letter frame (what happened, when, what changed, what you are doing now).',
        'Keep it short, answer only the question you were asked, and attach real proof where it helps. ApprovalPrep is a self-service tool: you fill it in and you send it yourself.'
      ],
      cta: { label: 'Download the sample (PDF)', url: SAMPLE_URL }
    },
    {
      kind: 'seq1', subject: 'Nine explanation letters, ready to fill in',
      heading: `The Letter of Explanation Kit${price(prices, 'letter-of-explanation')}`,
      paragraphs: [
        'The sample is the general frame. The full kit has editable DOCX templates for 9 situations, including late payments, bank statement questions, large deposits and address history.',
        'Each comes with fill-in prompts, a self-review checklist, and a list of what to attach and what to leave out.'
      ],
      cta: { label: 'See the Letter of Explanation Kit', url: `${SITE}/letter-of-explanation/` }
    },
    {
      kind: 'seq2', subject: 'If the question is about your credit report',
      heading: `The Credit Letter Kit${price(prices, 'credit-letter-kit')}`,
      paragraphs: [
        'Credit questions usually need a different letter: a dispute, a goodwill request, a debt validation request or a follow-up to the bureau.',
        'The Credit Letter Kit has templates for each, plus a credit report error checklist. You write and send them yourself; nothing is promised about what a bureau or creditor decides.'
      ],
      cta: { label: 'See the Credit Letter Kit', url: `${SITE}/pricing/` }
    },
    {
      kind: 'seq3', subject: 'Applying for a rental?',
      heading: `The Rental Application Kit${price(prices, 'rental-application-kit')}`,
      paragraphs: [
        'Landlords tend to ask for the same papers: proof of income, rental history, employment verification, and an explanation for anything unusual.',
        'The Rental Application Kit has a rental cover letter, rental-history and income explanations, a landlord follow-up letter and a move-in document checklist in one packet.'
      ],
      cta: { label: 'See the Rental Application Kit', url: `${SITE}/pricing/` }
    },
    {
      kind: 'seq4', subject: 'Every ApprovalPrep kit in one download',
      heading: `The Complete ApprovalPrep Bundle${price(prices, 'complete-approvalprep-bundle')}`,
      paragraphs: [
        'The bundle has every kit: letters of explanation, income and employment, credit, rental, loan prep, business funding and life admin.',
        'It suits anyone facing more than one application this year. This is the last email in this short series.'
      ],
      cta: { label: 'See the Complete Bundle', url: `${SITE}/pricing/` }
    }
  ];
}

export function reviewAsk(productName) {
  return {
    kind: 'review_ask', subject: 'A quick question about your ApprovalPrep kit',
    heading: 'Did the kit help?',
    paragraphs: [
      `If ${productName ? `the ${productName}` : 'the kit you bought'} helped, would you reply with a sentence or two about how? We would only ever show it with your first name, and only if you say yes in your reply.`,
      'If you would rather not, just ignore this. It is the only time we will ask.'
    ]
  };
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function emailHash(email) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(email).trim().toLowerCase())));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`unsubscribe:${value}`))).slice(0, 32);
}

/** The link carries a hash of the address and a signature, never the address itself. */
export async function unsubscribeUrl(secret, hash) {
  return `${SITE}/api/unsubscribe?id=${hash}&t=${await hmac(secret, hash)}`;
}

export async function verifyUnsubscribe(secret, hash, token) {
  if (!/^[0-9a-f]{64}$/.test(String(hash)) || !/^[0-9a-f]{32}$/.test(String(token))) return false;
  return (await hmac(secret, hash)) === token;
}

export function normalizeEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** One email, html + text, both with the unsubscribe link and the mailing address. */
export function renderEmail(step, unsubscribe) {
  const footer = 'You are getting this because you asked for a free sample or starter, or bought from ApprovalPrep.';
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2933;line-height:1.55"><h1 style="font-size:22px">${esc(step.heading)}</h1>${step.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${step.cta ? `<p><a href="${esc(step.cta.url)}" style="display:inline-block;background:#1f2933;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">${esc(step.cta.label)}</a></p>` : ''}<hr style="border:none;border-top:1px solid #ddd;margin:28px 0 12px"><p style="font-size:12px;color:#777">${esc(footer)} <a href="${esc(unsubscribe)}">Unsubscribe</a> (one click).<br>ApprovalPrep, ${esc(MAILING_ADDRESS)}</p></div>`;
  const text = `${step.heading}\n\n${step.paragraphs.join('\n\n')}${step.cta ? `\n\n${step.cta.label}: ${step.cta.url}` : ''}\n\n--\n${footer}\nUnsubscribe (one click): ${unsubscribe}\nApprovalPrep, ${MAILING_ADDRESS}\n`;
  return { html, text };
}

/** NAMED STOP when sending cannot work; null when it can. */
export function nurtureStop(env) {
  if (!env?.PRODUCTS_DB) return 'NAMED STOP [NO_DB] the PRODUCTS_DB binding is missing';
  if (!env.RESEND_API_KEY) return 'NAMED STOP [NO_RESEND_KEY] RESEND_API_KEY is not set on the Pages project';
  if (!env.DOWNLOAD_SIGNING_SECRET) return 'NAMED STOP [NO_SIGNING_SECRET] DOWNLOAD_SIGNING_SECRET is not set, so no unsubscribe link can be signed';
  return null;
}

export async function ensureTables(db) {
  for (const ddl of NURTURE_DDL) await db.prepare(ddl).run();
}

const sqlTime = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
const parseSql = (v) => Date.parse(`${String(v).replace(' ', 'T')}Z`);

/** Which step is due now for an address. Pure. */
export function dueStep(steps, sentKinds, lastSentAt, now) {
  const next = steps.find((s) => !sentKinds.has(s.kind));
  if (!next) return null;
  if (next.kind !== 'seq0' && next.kind !== 'cs0' && lastSentAt != null && now - lastSentAt < DAYS_BETWEEN * DAY) return null;
  return next;
}

async function sendOnce(env, email, hash, step, fetchImpl, scheduledAt = null) {
  const db = env.PRODUCTS_DB;
  const claim = await db.prepare('INSERT OR IGNORE INTO email_sends (email_hash, kind) VALUES (?, ?)').bind(hash, step.kind).run();
  if (claim?.meta?.changes === 0) return 'ALREADY';
  const unsubscribe = await unsubscribeUrl(env.DOWNLOAD_SIGNING_SECRET, hash);
  const { html, text } = renderEmail(step, unsubscribe);
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.APP_FROM_EMAIL || env.EMAIL_FROM || DEFAULT_FROM, to: [email], reply_to: env.EMAIL_REPLY_TO || REPLY_TO, subject: step.subject, html, text,
      headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {})
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    await db.prepare('DELETE FROM email_sends WHERE email_hash = ? AND kind = ?').bind(hash, step.kind).run(); // retry next run
    console.error(JSON.stringify({ event: 'NURTURE_SEND_FAILED', kind: step.kind, status: res.status }));
    return 'FAILED';
  }
  await db.prepare('UPDATE email_sends SET provider_message_id = ? WHERE email_hash = ? AND kind = ?').bind(body.id ?? null, hash, step.kind).run();
  return 'SENT';
}

async function livePrices(db) {
  try {
    const rows = (await db.prepare("SELECT slug, price_cents FROM products WHERE status = 'live'").bind().all()).results ?? [];
    return Object.fromEntries(rows.map((r) => [r.slug, Number(r.price_cents)]));
  } catch { return {}; }
}

/** Store a typed-in sign-up and send the free item at once (magnet: 'loe' sample or 'credit-starter'). */
export async function signUpForSample(env, email, fetchImpl = fetch, magnet = 'loe') {
  const starter = magnet === 'credit-starter';
  const stop = nurtureStop(env);
  if (stop && !env?.PRODUCTS_DB) return { status: 'STOPPED', stop };
  const db = env.PRODUCTS_DB;
  await ensureTables(db);
  await db.prepare('INSERT INTO email_signups (email, consent_text, source) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING').bind(email, starter ? STARTER_CONSENT_TEXT : CONSENT_TEXT, starter ? STARTER_SOURCE : SAMPLE_SOURCE).run();
  if (stop) return { status: 'STOPPED', stop };
  const hash = await emailHash(email);
  if (await db.prepare('SELECT 1 FROM email_optouts WHERE email_hash = ?').bind(hash).first()) return { status: 'OPTED_OUT' };
  return { status: await sendOnce(env, email, hash, (starter ? starterSequence() : sequence())[0], fetchImpl) };
}

/**
 * Called by the Stripe webhook on a paid checkout. Stores only a hash of the address (the series
 * stops on purchase) and hands the ONE review ask to Resend, scheduled about 3 days out. The
 * address is used for that one request and never written to D1.
 */
export async function recordPurchase(env, email, productName, now = Date.now(), fetchImpl = fetch) {
  const clean = normalizeEmail(email);
  const db = env?.PRODUCTS_DB;
  if (!db || !clean) return { status: 'SKIPPED' };
  await ensureTables(db);
  const hash = await emailHash(clean);
  await db.prepare('INSERT OR IGNORE INTO purchaser_hashes (email_hash) VALUES (?)').bind(hash).run();
  const stop = nurtureStop(env);
  if (stop) return { status: 'STOPPED', stop };
  if (await db.prepare('SELECT 1 FROM email_optouts WHERE email_hash = ?').bind(hash).first()) return { status: 'OPTED_OUT' };
  const at = new Date(now + REVIEW_ASK_AFTER_HOURS * 3_600_000).toISOString();
  return { status: await sendOnce(env, clean, hash, reviewAsk(productName), fetchImpl, at) };
}

/** One run: the series emails that are due. */
export async function runNurture(env, now = Date.now(), fetchImpl = fetch) {
  const stop = nurtureStop(env);
  if (stop) return { stop, sent: 0 };
  const db = env.PRODUCTS_DB;
  await ensureTables(db);
  const optouts = new Set(((await db.prepare('SELECT email_hash FROM email_optouts').bind().all()).results ?? []).map((r) => r.email_hash));
  const buyers = new Set(((await db.prepare('SELECT email_hash FROM purchaser_hashes').bind().all()).results ?? []).map((r) => r.email_hash));
  const byHash = new Map();
  for (const s of (await db.prepare('SELECT email_hash, kind, sent_at FROM email_sends').bind().all()).results ?? []) {
    const e = byHash.get(s.email_hash) ?? { kinds: new Set(), last: null };
    e.kinds.add(s.kind); e.last = Math.max(e.last ?? 0, parseSql(s.sent_at));
    byHash.set(s.email_hash, e);
  }
  const prices = await livePrices(db);
  let sent = 0;
  for (const r of (await db.prepare('SELECT email, source FROM email_signups ORDER BY created_at').bind().all()).results ?? []) {
    if (sent >= MAX_PER_RUN) break;
    const hash = await emailHash(r.email);
    if (optouts.has(hash) || buyers.has(hash)) continue; // stop on unsubscribe or purchase
    const e = byHash.get(hash) ?? { kinds: new Set(), last: null };
    const step = dueStep(sequenceFor(r.source, prices), e.kinds, e.last, now);
    if (step && (await sendOnce(env, r.email, hash, step, fetchImpl)) === 'SENT') { sent++; e.kinds.add(step.kind); e.last = now; byHash.set(hash, e); }
  }
  return { stop: null, sent };
}

/** Unsubscribe: record the opt-out by hash. */
export async function optOut(db, hash) {
  await ensureTables(db);
  await db.prepare('INSERT OR IGNORE INTO email_optouts (email_hash) VALUES (?)').bind(hash).run();
}
