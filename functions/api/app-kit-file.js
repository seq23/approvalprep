import { appJson, validKitUrl } from '../_runtime/app-kit.js';
export async function onRequestGet({ request, env }) {
  try {
    if (!await validKitUrl(new URL(request.url), env.DOWNLOAD_SIGNING_SECRET)) return appJson({ error: 'KIT_NOT_AVAILABLE' }, 403);
    const file = await env.PRODUCT_ASSETS_R2?.get(`app-kits/${new URL(request.url).searchParams.get('kit') || 'credit-letter-kit'}.json`);
    if (!file) return appJson({ stop: 'APP_KIT_ASSET_MISSING' }, 503);
    return new Response(file.body, { headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
  } catch { return appJson({ error: 'KIT_NOT_AVAILABLE' }, 403); }
}
