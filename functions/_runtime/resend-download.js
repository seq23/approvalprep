// Resend a paid buyer's download link. The caller supplies ONLY the Stripe checkout session id
// from their success page. The server looks the order up with Stripe and, if it is a paid order
// for a known kit, emails the address Stripe holds for that order a link the server builds.
// Recipient, SKU, URL and text from the caller are never used. The answer is the same whether or
// not the order exists (no enumeration). Limits: 20/hour per IP, 3/hour per order, 200/day overall.
// Behaviour guard: scripts/validate/resend-download-email.mjs.
import { json } from './responses.js';
import { normalizeEmail, SITE, DEFAULT_FROM, REPLY_TO } from './nurture.js';
import { DAY, HOUR, clientIp, sha256, withinLimit } from './rate-limit.js';

export const LIMITS = { perIpHour: 20, perOrderHour: 3, globalDay: 200 };
export const KITS = {
  'letter-of-explanation': 'Letter of Explanation Kit',
  'income-employment-letter-kit': 'Income & Employment Letter Kit',
  'credit-letter-kit': 'Credit Letter Kit',
  'rental-application-kit': 'Rental Application Kit',
  'loan-prep-letter-kit': 'Loan Prep Letter Kit',
  'business-funding-prep-kit': 'Business Funding Prep Kit',
  'life-admin-letter-kit': 'Life Admin Letter Kit',
  'complete-approvalprep-bundle': 'Complete ApprovalPrep Bundle'
};
export const ACCEPTED = { status: 'ACCEPTED', message: 'If this matches a paid ApprovalPrep order, the download link has been emailed to the address used at checkout.' };
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const tooMany = () => json({ status: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' }, 429);
// The limit store down is a plain 503 with the contact address, never an uncounted send and never a bare 500.
const storeDown = (event, message) => {
  console.error(JSON.stringify({ event, stop: `NAMED STOP [${event}] the rate-limit store failed` }));
  return json({ status: 'UNAVAILABLE', message }, 503);
};
const RESEND_UNAVAILABLE = 'Email resend is unavailable right now. Contact info@approvalprep.com with your Stripe receipt.';
const LOOKUP_UNAVAILABLE = 'This is unavailable right now. Contact info@approvalprep.com with your Stripe receipt.';

/** The order a Stripe Checkout Session stands for: paid, for a known kit, with an address; else null. */
export function orderFromSession(s, sessionId = s?.id) {
  const paid = s?.payment_status === 'paid' || (s?.payment_status === 'no_payment_required' && s?.status === 'complete' && Number(s?.amount_total || 0) === 0);
  const sku = s?.metadata?.sku || s?.metadata?.product_id || s?.client_reference_id || '';
  const email = normalizeEmail(s?.customer_details?.email || s?.customer_email);
  if (!paid || !KITS[sku] || !email || !sessionId || s.id !== sessionId) return null;
  return { sku, email };
}

async function isRevoked(env, sessionId) {
  if (!env.PRODUCTS_DB) return false;
  return Boolean(await env.PRODUCTS_DB.prepare('SELECT 1 FROM download_entitlements WHERE stripe_session_id=? AND revoked_at IS NOT NULL').bind(sessionId).first().catch(() => null));
}

export async function paidOrder(env, sessionId, fetchImpl = fetch) {
  if (await isRevoked(env, sessionId)) return null;
  const res = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (!res.ok) return null;
  return orderFromSession(await res.json().catch(() => ({})), sessionId);
}

const downloadLink = (sessionId, sku) => `${SITE}/checkout/success?session_id=${encodeURIComponent(sessionId)}&sku=${encodeURIComponent(sku)}`;
const SELF_HELP = 'ApprovalPrep gives self-service tools only. We do not contact bureaus, landlords, lenders, employers, or creditors for you.';

export async function resendDownload(request, env, fetchImpl = fetch, now = Date.now()) {
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body?.session_id ?? body?.order_id ?? '').trim();
  const db = env?.PRODUCTS_DB;
  if (!db || !env.RESEND_API_KEY || !env.STRIPE_SECRET_KEY) {
    console.error(JSON.stringify({ event: 'RESEND_DOWNLOAD_STOP', stop: 'NAMED STOP [RESEND_DOWNLOAD_NOT_CONFIGURED] PRODUCTS_DB, RESEND_API_KEY or STRIPE_SECRET_KEY missing' }));
    return json({ status: 'UNAVAILABLE', message: RESEND_UNAVAILABLE }, 503);
  }
  try {
    if (!(await withinLimit(db, `rdl:ip:${await sha256(clientIp(request))}`, LIMITS.perIpHour, HOUR, now))) return tooMany();
    if (!SESSION_RE.test(sessionId)) return json(ACCEPTED, 202);
    if (!(await withinLimit(db, `rdl:order:${await sha256(sessionId)}`, LIMITS.perOrderHour, HOUR, now))) return tooMany();
    if (!(await withinLimit(db, 'rdl:global', LIMITS.globalDay, DAY, now))) return tooMany();
  } catch { return storeDown('RESEND_DOWNLOAD_LIMIT_UNAVAILABLE', RESEND_UNAVAILABLE); }

  let order = null;
  try { order = await paidOrder(env, sessionId, fetchImpl); } catch { order = null; }
  if (!order) return json(ACCEPTED, 202);

  const link = downloadLink(sessionId, order.sku);
  const kit = KITS[order.sku];
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.APP_FROM_EMAIL || env.EMAIL_FROM || DEFAULT_FROM,
      to: [order.email],
      reply_to: env.EMAIL_REPLY_TO || REPLY_TO,
      subject: 'Your ApprovalPrep download link',
      text: `Your ${kit} is ready to download:\n${link}\n\n${SELF_HELP}`
    })
  }).catch(() => null);
  if (!res?.ok) console.error(JSON.stringify({ event: 'RESEND_DOWNLOAD_SEND_FAILED', status: res?.status ?? 0 }));
  return json(ACCEPTED, 202);
}

// WEBSITE_ORDER_EMAIL_LOOKUP. POST /api/email-download-links { email }: a website buyer who kept no
// link types the address she paid with. The site keeps no buyer list, so Stripe is searched (Checkout
// Sessions filtered by customer_details.email, read only). Each paid, unrefunded ApprovalPrep order
// found gets the same download link the site already emails, sent ONLY to that address. The answer is
// identical found or not, and the search and send run after the answer when the runtime allows, so
// nobody can learn whether an address bought something. Nothing about an order goes back to the caller.
// Limits: 10/hour per IP, 3/hour per address, the shared 200/day send cap.
// Behaviour guard: scripts/validate/resend-download-email.mjs.
export const EMAIL_LIMITS = { perIpHour: 10, perEmailHour: 3 };
export const EMAIL_ACCEPTED = { status: 'ACCEPTED', message: "If that email bought a kit, we've sent the link to it." };
const MAX_ORDERS = 10;

async function findPaidOrders(env, email, fetchImpl) {
  const res = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions?${new URLSearchParams({ 'customer_details[email]': email, status: 'complete', limit: '100' })}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (!res.ok) {
    console.error(JSON.stringify({ event: 'EMAIL_LOOKUP_STOP', stop: `NAMED STOP [EMAIL_LOOKUP_STRIPE_REFUSED] Stripe answered ${res.status} to the Checkout Sessions list; STRIPE_SECRET_KEY needs Checkout Sessions read` }));
    return [];
  }
  const list = await res.json().catch(() => ({}));
  const orders = [];
  for (const s of Array.isArray(list?.data) ? list.data : []) {
    const order = orderFromSession(s);
    if (!order || order.email !== email || await isRevoked(env, s.id)) continue;
    orders.push({ sessionId: s.id, sku: order.sku });
    if (orders.length >= MAX_ORDERS) break;
  }
  return orders;
}

async function sendOrderLinks(env, email, fetchImpl) {
  const orders = await findPaidOrders(env, email, fetchImpl);
  if (!orders.length) return;
  const lines = orders.map((o) => `${KITS[o.sku]}:\n${downloadLink(o.sessionId, o.sku)}`).join('\n\n');
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.APP_FROM_EMAIL || env.EMAIL_FROM || DEFAULT_FROM,
      to: [email],
      reply_to: env.EMAIL_REPLY_TO || REPLY_TO,
      subject: 'Your ApprovalPrep download link',
      text: `Here is the download link for what you bought on approvalprep.com. To open it in the ApprovalPrep app, paste the link in More, "Bought on approvalprep.com?".\n\n${lines}\n\nYou did not need to buy anything again. If you did not ask for this, you can ignore it.\n\n${SELF_HELP}`
    })
  }).catch(() => null);
  if (!res?.ok) console.error(JSON.stringify({ event: 'EMAIL_LOOKUP_SEND_FAILED', status: res?.status ?? 0 }));
}

export async function emailDownloadLinks(request, env, fetchImpl = fetch, now = Date.now(), waitUntil = null) {
  const db = env?.PRODUCTS_DB;
  if (!db || !env.RESEND_API_KEY || !env.STRIPE_SECRET_KEY) {
    console.error(JSON.stringify({ event: 'EMAIL_LOOKUP_STOP', stop: 'NAMED STOP [EMAIL_LOOKUP_NOT_CONFIGURED] PRODUCTS_DB, RESEND_API_KEY or STRIPE_SECRET_KEY missing' }));
    return json({ status: 'UNAVAILABLE', message: LOOKUP_UNAVAILABLE }, 503);
  }
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  try {
    if (!(await withinLimit(db, `edl:ip:${await sha256(clientIp(request))}`, EMAIL_LIMITS.perIpHour, HOUR, now))) return tooMany();
    if (!email) return json(EMAIL_ACCEPTED, 202);
    if (!(await withinLimit(db, `edl:email:${await sha256(email)}`, EMAIL_LIMITS.perEmailHour, HOUR, now))) return tooMany();
    if (!(await withinLimit(db, 'rdl:global', LIMITS.globalDay, DAY, now))) return tooMany();
  } catch { return storeDown('EMAIL_LOOKUP_LIMIT_UNAVAILABLE', LOOKUP_UNAVAILABLE); }
  const work = sendOrderLinks(env, email, fetchImpl).catch(() => console.error(JSON.stringify({ event: 'EMAIL_LOOKUP_SEND_FAILED', status: 0 })));
  if (waitUntil) waitUntil(work); else await work;
  return json(EMAIL_ACCEPTED, 202);
}
