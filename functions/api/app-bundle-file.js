import { bundleJson, validBundleUrl } from '../_runtime/app-bundle.js';
export async function onRequestGet({ request, env }) {
  try {
    if (!await validBundleUrl(new URL(request.url), env.DOWNLOAD_SIGNING_SECRET)) return bundleJson({ error: 'BUNDLE_NOT_AVAILABLE' }, 403);
    const file = await env.PRODUCT_ASSETS_R2?.get('app-kits/complete-approvalprep-bundle.zip');
    if (!file) return bundleJson({ stop: 'APP_BUNDLE_ASSET_MISSING' }, 503);
    return new Response(file.body, { headers: { 'content-type': 'application/zip', 'content-disposition': 'attachment; filename="ApprovalPrep-bundle.zip"', 'cache-control': 'private, no-store' } });
  } catch { return bundleJson({ error: 'BUNDLE_NOT_AVAILABLE' }, 403); }
}
