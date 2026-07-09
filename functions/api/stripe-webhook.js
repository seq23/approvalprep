import { json } from '../_runtime/responses.js';
async function hmacHex(secret, payload){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function timingSafeEqual(a,b){
  if(a.length!==b.length) return false;
  let out=0;
  for(let i=0;i<a.length;i++) out|=a.charCodeAt(i)^b.charCodeAt(i);
  return out===0;
}
async function verifyStripeSignature(request, env, body){
  if(!env.STRIPE_WEBHOOK_SECRET) return {ok:false,error:'MISSING_STRIPE_WEBHOOK_SECRET'};
  const header=request.headers.get('stripe-signature')||'';
  const parts=Object.fromEntries(header.split(',').map(p=>p.split('=').map(v=>v.trim())).filter(p=>p.length===2));
  const timestamp=parts.t;
  const signature=parts.v1;
  if(!timestamp||!signature) return {ok:false,error:'MISSING_STRIPE_SIGNATURE'};
  const age=Math.abs(Math.floor(Date.now()/1000)-Number(timestamp));
  if(!Number.isFinite(age)||age>300) return {ok:false,error:'STALE_STRIPE_SIGNATURE'};
  const expected=await hmacHex(env.STRIPE_WEBHOOK_SECRET,`${timestamp}.${body}`);
  return timingSafeEqual(expected,signature) ? {ok:true} : {ok:false,error:'INVALID_STRIPE_SIGNATURE'};
}
async function recordCheckout(env, session){
  if(!env.PRODUCTS_DB) return;
  const productId=session.metadata?.sku || session.metadata?.product_id || session.client_reference_id || '';
  if(!productId) return;
  const existing=await env.PRODUCTS_DB.prepare('SELECT id FROM download_entitlements WHERE stripe_session_id=?').bind(session.id).first();
  const id=existing?.id||crypto.randomUUID();
  await env.PRODUCTS_DB.prepare('INSERT OR REPLACE INTO download_entitlements (id,stripe_session_id,product_id,customer_email,payment_status,amount_total,currency,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,session.id,productId,'',session.payment_status||'unknown',session.amount_total||0,session.currency||'usd',new Date().toISOString(),new Date(Date.now()+1000*60*60*24*30).toISOString()).run();
}
export async function onRequestPost({ request, env }){
  const raw=await request.text();
  const verified=await verifyStripeSignature(request,env,raw);
  if(!verified.ok) return json({ok:false,error:verified.error},400);
  const event=JSON.parse(raw);
  if(!event?.type) return json({ok:false,error:'INVALID_EVENT'},400);
  if(event.type==='checkout.session.completed') await recordCheckout(env,event.data.object);
  return json({ok:true,received:true});
}
