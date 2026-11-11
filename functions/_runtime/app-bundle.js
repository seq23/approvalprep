const PRODUCTS = ['ap_complete_bundle', 'ap_bundle_upgrade'];
export const bundleJson = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
export function ownsProduct(subscriber, product) {
  const entitlement = subscriber?.entitlements?.[product];
  return entitlement?.product_identifier === product && entitlement.expires_date === null
    && subscriber?.non_subscriptions?.[product]?.some(t => t.is_sandbox === false && !t.refunded_at) === true;
}
export const ownsBundle = subscriber => PRODUCTS.some(id => ownsProduct(subscriber, id));
async function key(secret) { return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
export async function bundleUrl(origin, secret, now = Date.now()) {
  const expires = Math.floor(now / 1000) + 300;
  const sig = await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode(`app-bundle:${expires}`));
  return `${origin}/api/app-bundle-file?expires=${expires}&sig=${Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('')}`;
}
export async function validBundleUrl(url, secret, now = Date.now()) {
  const expires = Number(url.searchParams.get('expires')), sig = url.searchParams.get('sig') || '';
  if (!secret || !Number.isInteger(expires) || expires <= now / 1000 || expires > now / 1000 + 300 || !/^[a-f0-9]{64}$/.test(sig)) return false;
  return crypto.subtle.verify('HMAC', await key(secret), Uint8Array.from(sig.match(/../g), h => parseInt(h, 16)), new TextEncoder().encode(`app-bundle:${expires}`));
}
