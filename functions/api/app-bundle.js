import { acceptsSandbox, bundleJson, ownsBundle, bundleUrl } from '../_runtime/app-bundle.js';
import { revenueCatPurchases } from '../_runtime/revenuecat.js';
import { clientIp, sha256, withinLimit } from '../_runtime/rate-limit.js';
// Private R2 assets only. No customer document, answers or letter text is uploaded.
export async function onRequestPost({ request, env }) {
  if (!env.APPROVALPREP_REVENUECAT_SECRET) return bundleJson({ stop: 'REVENUECAT_SECRET_MISSING' }, 503);
  if (!env.DOWNLOAD_SIGNING_SECRET || !env.PRODUCT_ASSETS_R2) return bundleJson({ stop: 'APP_BUNDLE_DELIVERY_NOT_READY' }, 503);
  const refused = () => bundleJson({ error: 'BUNDLE_NOT_AVAILABLE' }, 403);
  const id = request.headers.get('authorization')?.match(/^Bearer (\$RCAnonymousID:[a-f0-9]{32})$/)?.[1];
  if (!id) return refused();
  if (!env.PRODUCTS_DB) return bundleJson({ stop: 'APP_BUNDLE_DELIVERY_NOT_READY' }, 503);
  try {
    // Each attempt costs a RevenueCat lookup; the cap leaves room for the 100-Restore load check.
    if (!await withinLimit(env.PRODUCTS_DB, `app-bundle:ip:${await sha256(clientIp(request))}`, 120, 60_000)) return bundleJson({ error: 'TOO_MANY_REQUESTS' }, 429);
    const rc = await revenueCatPurchases(id, env.APPROVALPREP_REVENUECAT_SECRET);
    if (rc.stop) return bundleJson({ stop: rc.stop }, 503);
    if (!ownsBundle(rc.purchases, acceptsSandbox(env))) return refused();
    const assets = env.PRODUCT_ASSETS_R2;
    const [credit, explanation, archive] = await Promise.all([
      assets.get('app-kits/credit-letter-kit.json'), assets.get('app-kits/letter-of-explanation-kit.json'), assets.head('app-kits/complete-approvalprep-bundle.zip'),
    ]);
    if (!credit || !explanation || !archive || !(archive.size > 0)) return bundleJson({ stop: 'APP_BUNDLE_ASSET_MISSING' }, 503);
    const kits = await Promise.all([credit.json(), explanation.json()]);
    return bundleJson({ kits, archiveUrl: await bundleUrl(new URL(request.url).origin, env.DOWNLOAD_SIGNING_SECRET) });
  } catch { return refused(); }
}
