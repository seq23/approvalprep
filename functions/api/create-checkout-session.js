import { json, readJson, publicBase } from '../_runtime/responses.js';
import { getProductBySlug } from '../_runtime/catalog.js';
import { createStripeCheckout, getStripeMode, assertStripeModeMatchesKey, stripeRequest } from '../_runtime/stripe.js';
import { clientIp, sha256, withinLimit, HOUR, DAY } from '../_runtime/rate-limit.js';

// Promo-code tries (security audit 27 Nov 2026, check 14): without a limit, a script could try code after
// code and read "not found" against a checkout link to learn which Stripe promotion codes exist. Only a
// try WITH a code is counted; checkout without a code is never limited. Fixed numbers, tested as such in
// scripts/validate/checkout-promo-limits.mjs.
export const PROMO_LIMITS = { perIpHour: 10, perBlockHour: 30, globalDay: 500 };
export const PROMO_TOO_MANY = 'Too many promo code tries from this connection. Wait an hour and try again, or clear the box to continue without a code.';
export const PROMO_UNCHECKED = 'We could not check promo codes just now. Try again in a few minutes, or clear the box to continue without a code.';

/** null when this try may go ahead, else the response that refuses it. A limiter that cannot be read refuses. */
async function promoRefusal(env, request, now) {
  const db = env.PRODUCTS_DB;
  if (!db) return json({ok:false,error:'PROMO_CHECK_UNAVAILABLE',message:PROMO_UNCHECKED},503);
  try {
    const ok = await withinLimit(db, `promo:ip:${await sha256(clientIp(request))}`, PROMO_LIMITS.perIpHour, HOUR, now)
      && await withinLimit(db, `promo:block:${await sha256(clientIp(request, 48))}`, PROMO_LIMITS.perBlockHour, HOUR, now)
      && await withinLimit(db, 'promo:global', PROMO_LIMITS.globalDay, DAY, now);
    return ok ? null : json({ok:false,error:'TOO_MANY_PROMO_TRIES',message:PROMO_TOO_MANY},429);
  } catch {
    return json({ok:false,error:'PROMO_CHECK_UNAVAILABLE',message:PROMO_UNCHECKED},503);
  }
}
export async function onRequestPost({ request, env, now = Date.now() }){
  const body=await readJson(request); const sku=body.sku || body.productId || body.slug; if(!sku) return json({ok:false,error:'MISSING_PRODUCT'},400);
  const discountCode=String(body.discount_code || body.discountCode || "").trim().toUpperCase();
  const product=await getProductBySlug(env, sku);
  if(!product || product.status!=='live' || (product.visibility && product.visibility!=='public')) return json({ok:false,error:'PRODUCT_NOT_AVAILABLE',message:'This product is not currently available.'},409);
  let mode='test';
  try { mode=assertStripeModeMatchesKey(env); } catch(e) { return json({ok:false,error:'STRIPE_MODE_MISMATCH',message:e.message},500); }
  const priceId=mode==='test' ? (product.stripe_test_price_id || product.stripeTestPriceId) : (product.stripe_live_price_id || product.stripeLivePriceId);
  if(!priceId) return json({ok:false,error:mode==='test'?'MISSING_STRIPE_TEST_PRICE':'MISSING_STRIPE_LIVE_PRICE',message:`This product is missing a Stripe ${mode} price.`},500);
  const base=publicBase(env, request); const params=new URLSearchParams();
  params.set('mode','payment'); params.set('line_items[0][price]', priceId); params.set('line_items[0][quantity]','1');
  params.set('metadata[sku]', product.slug || product.id); params.set('metadata[product_id]', product.id || product.slug); params.set('metadata[product_name]', product.name); params.set('metadata[stripe_mode]', getStripeMode(env));
  if (discountCode) params.set('metadata[discount_code]', discountCode);
  params.set('client_reference_id', product.slug || product.id);
  params.set('success_url', `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}&sku=${encodeURIComponent(product.slug || product.id)}`); params.set('cancel_url', `${base}/pricing?checkout=cancelled`);
  try {
    if (discountCode) {
      const refused = await promoRefusal(env, request, now);
      if (refused) return refused;
      const promotions = await stripeRequest(env, `/promotion_codes?code=${encodeURIComponent(discountCode)}&active=true`, { method: 'GET' });
      const promo = promotions?.data?.[0];
      if (!promo?.id) return json({ok:false,error:'INVALID_DISCOUNT_CODE',message:'That promo code was not found or is no longer active. Check the spelling, or clear the box to continue without a code.'},400);
      params.set('discounts[0][promotion_code]', promo.id);
    } else {
      params.set('allow_promotion_codes','true');
    }
    const session=await createStripeCheckout(env,params);
    return json({ok:true,checkoutUrl:session.url,sessionId:session.id,sku,discountCode:discountCode || null});
  }
  catch(e){ return json({ok:false,error:'STRIPE_CHECKOUT_FAILED',message:e.message},502); }
}
export async function onRequestGet(){ return json({ok:false,error:'POST_REQUIRED'},405); }
