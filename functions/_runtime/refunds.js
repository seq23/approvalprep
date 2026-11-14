// A fully refunded purchase loses its downloads. Stripe sends charge.refunded to
// /api/stripe-webhook; the paid Checkout Session(s) behind that charge get their
// entitlement row marked revoked. Both download paths (verify-download and
// download-file) check isSessionRevoked BEFORE their Stripe fallback, because a
// refunded Checkout Session still reports payment_status "paid" and would
// otherwise unlock again. Behaviour test: scripts/validate/payment-download.mjs.
import { stripeRequest } from './stripe.js';

export async function isSessionRevoked(env, sessionId) {
  if (!env.PRODUCTS_DB || !sessionId) return false;
  try {
    const row = await env.PRODUCTS_DB.prepare('SELECT revoked_at FROM download_entitlements WHERE stripe_session_id=? AND revoked_at IS NOT NULL').bind(sessionId).first();
    return Boolean(row);
  } catch {
    return false;
  }
}

/** Revokes every entitlement paid by this charge when it is fully refunded. Returns the session ids revoked. */
export async function revokeRefundedCharge(env, charge, request = stripeRequest) {
  if (!charge?.refunded || !charge.payment_intent) return [];
  if (!env.PRODUCTS_DB) throw new Error('PRODUCTS_DB binding missing; refund could not revoke downloads');
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id;
  const sessions = await request(env, `/checkout/sessions?payment_intent=${encodeURIComponent(pi)}&limit=10`, { method: 'GET' });
  const now = new Date().toISOString();
  const revoked = [];
  for (const session of sessions?.data || []) {
    const productId = session.metadata?.sku || session.metadata?.product_id || session.client_reference_id || '';
    const existing = await env.PRODUCTS_DB.prepare('SELECT id FROM download_entitlements WHERE stripe_session_id=?').bind(session.id).first();
    if (existing) {
      await env.PRODUCTS_DB.prepare('UPDATE download_entitlements SET revoked_at=? WHERE stripe_session_id=?').bind(now, session.id).run();
    } else if (productId) {
      // The paid webhook was missed: write the row already revoked so the Stripe fallback cannot unlock it.
      await env.PRODUCTS_DB.prepare('INSERT INTO download_entitlements (id,stripe_session_id,product_id,customer_email,payment_status,amount_total,currency,created_at,expires_at,revoked_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), session.id, productId, '', 'refunded', session.amount_total || 0, session.currency || 'usd', now, now, now).run();
    } else continue;
    revoked.push(session.id);
  }
  return revoked;
}
