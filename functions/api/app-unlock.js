import { APP_KIT_PRODUCT, appJson, signedKitUrl } from '../_runtime/app-kit.js';
// Unknown IDs, missing purchases, and upstream errors have the same public response.
export async function onRequestPost({ request, env }) {
  if (!env.APPROVALPREP_REVENUECAT_SECRET) return appJson({ stop: 'REVENUECAT_SECRET_MISSING' }, 503);
  if (!env.DOWNLOAD_SIGNING_SECRET || !env.PRODUCT_ASSETS_R2) return appJson({ stop: 'APP_KIT_DELIVERY_NOT_READY' }, 503);
  const refused = () => appJson({ error: 'KIT_NOT_AVAILABLE' }, 403);
  const id = request.headers.get('authorization')?.match(/^Bearer (\$RCAnonymousID:[a-f0-9]{32})$/)?.[1];
  if (!id) return refused();
  try {
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${env.APPROVALPREP_REVENUECAT_SECRET}` }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return refused();
    const { subscriber } = await response.json();
    const entitlement = subscriber?.entitlements?.[APP_KIT_PRODUCT];
    const transactions = subscriber?.non_subscriptions?.[APP_KIT_PRODUCT];
    if (entitlement?.product_identifier !== APP_KIT_PRODUCT || entitlement.expires_date !== null || !Array.isArray(transactions) || !transactions.some(t => t.is_sandbox === false && !t.refunded_at)) return refused();
    return appJson({ url: await signedKitUrl(new URL(request.url).origin, env.DOWNLOAD_SIGNING_SECRET) });
  } catch { return refused(); }
}
