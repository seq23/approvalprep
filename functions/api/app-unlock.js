import { APP_KITS, appJson, signedKitUrl } from '../_runtime/app-kit.js';
import { clientIp, sha256, withinLimit } from '../_runtime/rate-limit.js';
// Unknown IDs, missing purchases, and upstream errors have the same public response.
export async function onRequestPost({ request, env }) {
  if (!env.APPROVALPREP_REVENUECAT_SECRET) return appJson({ stop: 'REVENUECAT_SECRET_MISSING' }, 503);
  if (!env.DOWNLOAD_SIGNING_SECRET || !env.PRODUCT_ASSETS_R2) return appJson({ stop: 'APP_KIT_DELIVERY_NOT_READY' }, 503);
  const refused = () => appJson({ error: 'KIT_NOT_AVAILABLE' }, 403);
  const kit = new URL(request.url).searchParams.get('kit') || 'credit-letter-kit';
  if (!Object.hasOwn(APP_KITS, kit)) return refused();
  const product = APP_KITS[kit];
  const id = request.headers.get('authorization')?.match(/^Bearer (\$RCAnonymousID:[a-f0-9]{32})$/)?.[1];
  if (!id) return refused();
  if (!env.PRODUCTS_DB) return appJson({ stop: 'APP_KIT_DELIVERY_NOT_READY' }, 503);
  try {
    if (!await withinLimit(env.PRODUCTS_DB, `app-unlock:ip:${await sha256(clientIp(request))}`, 10, 60_000)) {
      return appJson({ error: 'TOO_MANY_REQUESTS' }, 429);
    }
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${env.APPROVALPREP_REVENUECAT_SECRET}` }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return refused();
    const { subscriber } = await response.json();
    const entitlement = subscriber?.entitlements?.[product];
    const transactions = subscriber?.non_subscriptions?.[product];
    if (entitlement?.product_identifier !== product || entitlement.expires_date !== null || !Array.isArray(transactions) || !transactions.some(t => t.is_sandbox === false && !t.refunded_at)) return refused();
    return appJson({ url: await signedKitUrl(new URL(request.url).origin, env.DOWNLOAD_SIGNING_SECRET, Date.now(), kit) });
  } catch { return refused(); }
}
