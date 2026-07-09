import { json, readJson, publicBase } from '../_runtime/responses.js';
import { getProductBySlug } from '../_runtime/catalog.js';
import { createStripeCheckout, getStripeMode, assertStripeModeMatchesKey, stripeRequest } from '../_runtime/stripe.js';
export async function onRequestPost({ request, env }){
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
      const promotions = await stripeRequest(env, `/promotion_codes?code=${encodeURIComponent(discountCode)}&active=true`, { method: 'GET' });
      const promo = promotions?.data?.[0];
      if (!promo?.id) return json({ok:false,error:'INVALID_DISCOUNT_CODE',message:`Discount code ${discountCode} was not found or is not active in Stripe ${mode} mode.`},400);
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
