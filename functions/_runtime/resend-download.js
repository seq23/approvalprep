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

async function paidOrder(env, sessionId, fetchImpl) {
  if (env.PRODUCTS_DB) {
    const revoked = await env.PRODUCTS_DB.prepare('SELECT 1 FROM download_entitlements WHERE stripe_session_id=? AND revoked_at IS NOT NULL').bind(sessionId).first().catch(() => null);
    if (revoked) return null;
  }
  const res = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (!res.ok) return null;
  const s = await res.json().catch(() => ({}));
  const paid = s.payment_status === 'paid' || (s.payment_status === 'no_payment_required' && s.status === 'complete' && Number(s.amount_total || 0) === 0);
  const sku = s.metadata?.sku || s.metadata?.product_id || s.client_reference_id || '';
  const email = normalizeEmail(s.customer_details?.email || s.customer_email);
  if (!paid || !KITS[sku] || !email || s.id !== sessionId) return null;
  return { sku, email };
}

export async function resendDownload(request, env, fetchImpl = fetch, now = Date.now()) {
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body?.session_id ?? body?.order_id ?? '').trim();
  const db = env?.PRODUCTS_DB;
  if (!db || !env.RESEND_API_KEY || !env.STRIPE_SECRET_KEY) {
    console.error(JSON.stringify({ event: 'RESEND_DOWNLOAD_STOP', stop: 'NAMED STOP [RESEND_DOWNLOAD_NOT_CONFIGURED] PRODUCTS_DB, RESEND_API_KEY or STRIPE_SECRET_KEY missing' }));
    return json({ status: 'UNAVAILABLE', message: 'Email resend is unavailable right now. Contact info@approvalprep.com with your Stripe receipt.' }, 503);
  }
  if (!(await withinLimit(db, `rdl:ip:${await sha256(clientIp(request))}`, LIMITS.perIpHour, HOUR, now))) return tooMany();
  if (!SESSION_RE.test(sessionId)) return json(ACCEPTED, 202);
  if (!(await withinLimit(db, `rdl:order:${await sha256(sessionId)}`, LIMITS.perOrderHour, HOUR, now))) return tooMany();
  if (!(await withinLimit(db, 'rdl:global', LIMITS.globalDay, DAY, now))) return tooMany();

  let order = null;
  try { order = await paidOrder(env, sessionId, fetchImpl); } catch { order = null; }
  if (!order) return json(ACCEPTED, 202);

  const link = `${SITE}/checkout/success?session_id=${encodeURIComponent(sessionId)}&sku=${encodeURIComponent(order.sku)}`;
  const kit = KITS[order.sku];
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.APP_FROM_EMAIL || env.EMAIL_FROM || DEFAULT_FROM,
      to: [order.email],
      reply_to: env.EMAIL_REPLY_TO || REPLY_TO,
      subject: 'Your ApprovalPrep download link',
      text: `Your ${kit} is ready to download:\n${link}\n\nApprovalPrep gives self-service tools only. We do not contact bureaus, landlords, lenders, employers, or creditors for you.`
    })
  }).catch(() => null);
  if (!res?.ok) console.error(JSON.stringify({ event: 'RESEND_DOWNLOAD_SEND_FAILED', status: res?.status ?? 0 }));
  return json(ACCEPTED, 202);
}
