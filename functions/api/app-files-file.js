import { appJson } from '../_runtime/app-kit.js';
import { CONTENT_TYPES, fileKey, validFileUrl } from '../_runtime/app-files.js';
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    if (!await validFileUrl(url, env.DOWNLOAD_SIGNING_SECRET)) return appJson({ error: 'KIT_NOT_AVAILABLE' }, 403);
    const kit = url.searchParams.get('kit'), type = url.searchParams.get('type');
    const file = await env.PRODUCT_ASSETS_R2?.get(fileKey(kit, type));
    if (!file) return appJson({ stop: 'APP_FILES_ASSET_MISSING' }, 503);
    return new Response(file.body, { headers: { 'content-type': CONTENT_TYPES[type], 'content-disposition': `attachment; filename="ApprovalPrep-${kit}.${type}"`, 'cache-control': 'private, no-store' } });
  } catch { return appJson({ error: 'KIT_NOT_AVAILABLE' }, 403); }
}
