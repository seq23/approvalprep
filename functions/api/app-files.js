import { appJson } from '../_runtime/app-kit.js';
import { acceptsSandbox } from '../_runtime/app-bundle.js';
import { FILE_TYPES, fileKey, isFileKit, ownsFileKit, signedFileUrl } from '../_runtime/app-files.js';
import { revenueCatPurchases } from '../_runtime/revenuecat.js';
import { clientIp, sha256, withinLimit } from '../_runtime/rate-limit.js';
// POST /api/app-files?kit=<website sku>: after RevenueCat confirms the kit (or the bundle), two
// five-minute signed links to the website kit's PDF guide and Word file. Unknown IDs, missing
// purchases and upstream errors all get the same refusal.
export async function onRequestPost({ request, env }) {
  if (!env.APPROVALPREP_REVENUECAT_SECRET) return appJson({ stop: 'REVENUECAT_SECRET_MISSING' }, 503);
  if (!env.DOWNLOAD_SIGNING_SECRET || !env.PRODUCT_ASSETS_R2 || !env.PRODUCTS_DB) return appJson({ stop: 'APP_FILES_DELIVERY_NOT_READY' }, 503);
  const refused = () => appJson({ error: 'KIT_NOT_AVAILABLE' }, 403);
  const kit = new URL(request.url).searchParams.get('kit');
  if (!isFileKit(kit)) return refused();
  const id = request.headers.get('authorization')?.match(/^Bearer (\$RCAnonymousID:[a-f0-9]{32})$/)?.[1];
  if (!id) return refused();
  try {
    // Room for a Restore that brings back all seven kits at once.
    if (!await withinLimit(env.PRODUCTS_DB, `app-files:ip:${await sha256(clientIp(request))}`, 30, 60_000)) return appJson({ error: 'TOO_MANY_REQUESTS' }, 429);
    const rc = await revenueCatPurchases(id, env.APPROVALPREP_REVENUECAT_SECRET);
    if (rc.stop) return appJson({ stop: rc.stop }, 503);
    if (!ownsFileKit(rc.purchases, kit, acceptsSandbox(env))) return refused();
    const heads = await Promise.all(FILE_TYPES.map(type => env.PRODUCT_ASSETS_R2.head(fileKey(kit, type))));
    if (heads.some(head => !head || !(head.size > 0))) return appJson({ stop: 'APP_FILES_ASSET_MISSING' }, 503);
    const origin = new URL(request.url).origin;
    return appJson({ kit, files: await Promise.all(FILE_TYPES.map(async type => ({ type, url: await signedFileUrl(origin, env.DOWNLOAD_SIGNING_SECRET, kit, type) }))) });
  } catch { return refused(); }
}
