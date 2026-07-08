export async function stripeRequest(env, path, init={}){
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  const res = await fetch('https://api.stripe.com/v1'+path, { ...init, headers:{ authorization:`Bearer ${key}`, 'content-type':'application/x-www-form-urlencoded', ...(init.headers||{}) }});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error?.message || 'Stripe request failed');
  return data;
}
export async function createStripeCheckout(env, params){ return stripeRequest(env, '/checkout/sessions', {method:'POST', body:params}); }
export async function createStripeProduct(env, name, description){ const body = new URLSearchParams({name, description:description||''}); return stripeRequest(env, '/products', {method:'POST', body}); }
export async function createStripePrice(env, productId, unitAmount, currency='usd'){ const body = new URLSearchParams({product:productId, unit_amount:String(unitAmount), currency}); return stripeRequest(env, '/prices', {method:'POST', body}); }
