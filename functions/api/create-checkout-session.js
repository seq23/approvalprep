import { json, readJson, publicBase } from '../_runtime/responses.js';
import { getProductBySlug } from '../_runtime/catalog.js';
import { createStripeCheckout } from '../_runtime/stripe.js';
export async function onRequestPost({ request, env }){
  const body=await readJson(request); const sku=body.sku || body.productId || body.slug; if(!sku) return json({ok:false,error:'MISSING_PRODUCT'},400);
  const product=await getProductBySlug(env, sku);
  if(!product || product.status!=='live' || (product.visibility && product.visibility!=='public')) return json({ok:false,error:'PRODUCT_NOT_AVAILABLE',message:'This product is not currently available.'},409);
  const priceId=product.stripe_live_price_id || product.stripeLivePriceId; if(!priceId) return json({ok:false,error:'MISSING_STRIPE_PRICE',message:'This product is missing a checkout price.'},500);
  const base=publicBase(env, request); const params=new URLSearchParams();
  params.set('mode','payment'); params.set('line_items[0][price]', priceId); params.set('line_items[0][quantity]','1');
  params.set('metadata[product_id]', product.slug || product.id); params.set('metadata[product_name]', product.name);
  params.set('success_url', `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`); params.set('cancel_url', `${base}/pricing?checkout=cancelled`);
  try { const session=await createStripeCheckout(env,params); return json({ok:true,checkoutUrl:session.url,sessionId:session.id,sku}); }
  catch(e){ return json({ok:false,error:'STRIPE_CHECKOUT_FAILED',message:e.message},502); }
}
export async function onRequestGet(){ return json({ok:false,error:'POST_REQUIRED'},405); }
