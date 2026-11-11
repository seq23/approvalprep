export const APP_KITS = { 'credit-letter-kit': 'ap_credit_kit', 'letter-of-explanation-kit': 'ap_explanation_kit' };
export const APP_KIT_KEY = 'app-kits/credit-letter-kit.json';
export const APP_KIT_PRODUCT = 'ap_credit_kit';
export const appJson = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
export async function signingKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signedKitUrl(origin, secret, now = Date.now(), kit = 'credit-letter-kit') {
  if (!Object.hasOwn(APP_KITS, kit)) throw Error('KIT_NOT_AVAILABLE');
  const key = `app-kits/${kit}.json`;
  const expires = Math.floor(now / 1000) + 300;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(`${key}:${expires}`));
  return `${origin}/api/app-kit-file?kit=${kit}&expires=${expires}&sig=${Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')}`;
}
export async function validKitUrl(url, secret, now = Date.now()) {
  const kit = url.searchParams.get('kit') || 'credit-letter-kit';
  if (!Object.hasOwn(APP_KITS, kit)) return false;
  const key = `app-kits/${kit}.json`;
  const expires = Number(url.searchParams.get('expires'));
  const sig = url.searchParams.get('sig') || '';
  if (!secret || !Number.isInteger(expires) || expires <= now / 1000 || expires > now / 1000 + 300 || !/^[a-f0-9]{64}$/.test(sig)) return false;
  return crypto.subtle.verify('HMAC', await signingKey(secret), Uint8Array.from(sig.match(/../g), h => parseInt(h, 16)), new TextEncoder().encode(`${key}:${expires}`));
}
