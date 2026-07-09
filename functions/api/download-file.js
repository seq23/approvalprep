import { json } from '../_runtime/responses.js';
import { getProductBySlug } from '../_runtime/catalog.js';

function contentTypeFor(type) {
  return type === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
}

function filenameFor(product, type) {
  return `${product.slug || product.id}.${type}`;
}

function r2KeyFor(product, type) {
  return type === 'docx'
    ? (product.docxKey || `downloads/${product.slug || product.id}.docx`)
    : (product.pdfKey || `downloads/${product.slug || product.id}.pdf`);
}

async function readEntitlement(env, sid) {
  if (!env.PRODUCTS_DB) return { productId: '', warning: 'PRODUCTS_DB binding missing; using Stripe verification fallback.' };
  try {
    const ent = await env.PRODUCTS_DB.prepare('SELECT product_id,payment_status,expires_at,revoked_at FROM download_entitlements WHERE stripe_session_id=? AND revoked_at IS NULL').bind(sid).first();
    if (!ent || ent.payment_status !== 'paid' || (ent.expires_at && new Date(ent.expires_at) < new Date())) return { productId: '' };
    return { productId: ent.product_id || '' };
  } catch (error) {
    return { productId: '', warning: `Entitlement lookup failed; using Stripe verification fallback. ${error?.message || 'Unknown D1 error'}` };
  }
}

async function fetchStripeSession(env, sid) {
  if (!env.STRIPE_SECRET_KEY) return { ok: false, response: json({ ok:false, error:'STRIPE_SECRET_REQUIRED' }, 500) };
  let res;
  try {
    res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  } catch (error) {
    return { ok:false, response: json({ ok:false, error:'STRIPE_VERIFY_FAILED', message:error?.message || 'Stripe request failed' }, 502) };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok:false, response: json({ ok:false, error:'STRIPE_VERIFY_FAILED', message:data.error?.message || 'Stripe verification failed' }, 502) };
  const productId = data.metadata?.sku || data.metadata?.product_id || data.client_reference_id || '';
  const isPaid = data.payment_status === 'paid';
  const isZeroDollarPromotion = data.payment_status === 'no_payment_required' && data.status === 'complete' && Number(data.amount_total || 0) === 0;
  if (!productId || (!isPaid && !isZeroDollarPromotion)) {
    return { ok:false, response: json({ ok:false, error:'DOWNLOAD_NOT_AUTHORIZED', checkoutStatus:data.status || '', paymentStatus:data.payment_status || '' }, 403) };
  }
  return { ok:true, productId };
}

export async function onRequestGet({ request, env }){
  try {
    const u=new URL(request.url);
    const sid=u.searchParams.get('session_id');
    const type=u.searchParams.get('type')||'pdf';
    if(!['pdf','docx'].includes(type)) return json({ok:false,error:'UNSUPPORTED_DOWNLOAD_TYPE'},415);
    if(!sid) return json({ok:false,error:'MISSING_SESSION'},400);
    if(!env.PRODUCT_ASSETS_R2) return json({ok:false,error:'RUNTIME_BINDINGS_REQUIRED',message:'PRODUCT_ASSETS_R2 binding is required for protected downloads.'},500);

    let productId = '';
    const entitlement = await readEntitlement(env, sid);
    productId = entitlement.productId;
    if (!productId) {
      const stripe = await fetchStripeSession(env, sid);
      if (!stripe.ok) return stripe.response;
      productId = stripe.productId;
    }

    const product = await getProductBySlug(env, productId);
    if (!product) return json({ok:false,error:'PRODUCT_NOT_FOUND'},404);

    let r2Key = r2KeyFor(product, type);
    let filename = filenameFor(product, type);
    let mimeType = contentTypeFor(type);

    if (env.PRODUCTS_DB) {
      try {
        const asset=await env.PRODUCTS_DB.prepare('SELECT r2_key,filename,mime_type FROM product_assets WHERE product_id=? AND asset_type=? AND active=1 ORDER BY created_at DESC LIMIT 1').bind(product.id || product.slug,type).first();
        if (asset?.r2_key) {
          r2Key = asset.r2_key;
          filename = asset.filename || filename;
          mimeType = asset.mime_type || mimeType;
        }
      } catch {}
    }

    const obj=await env.PRODUCT_ASSETS_R2.get(r2Key);
    if(!obj) return json({ok:false,error:'R2_OBJECT_MISSING',r2Key},404);
    return new Response(obj.body,{headers:{'content-type':mimeType,'content-disposition':`attachment; filename="${filename}"`,'cache-control':'private, no-store'}});
  } catch (error) {
    return json({ok:false,error:'DOWNLOAD_FILE_EXCEPTION',message:error?.message || 'Unknown download-file exception'},500);
  }
}
