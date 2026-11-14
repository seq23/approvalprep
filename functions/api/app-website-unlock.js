import { appJson } from '../_runtime/app-kit.js';
import { bundleUrl } from '../_runtime/app-bundle.js';
import { APP_FILE_KITS, FILE_TYPES, fileKey, signedFileUrl } from '../_runtime/app-files.js';
import { paidOrder } from '../_runtime/resend-download.js';
import { clientIp, sha256, withinLimit, HOUR } from '../_runtime/rate-limit.js';
// POST /api/app-website-unlock { order }: a kit bought on approvalprep.com opens in the phone app at no
// charge (risk brain: a returning buyer is never asked to pay again; App Store rule 3.1.3(b) lets an app
// open content bought elsewhere when it is also sold in the app). `order` is the link from her download
// page or from the "Your ApprovalPrep download link" email; only its Stripe checkout id is read. That id
// is the same proof the website's own download page accepts, so nothing opens here that the website
// would not already open. Paid and not refunded (Stripe + the refunds table), else the same refusal.
export const ORDER_RE = /cs_(?:live|test)_[A-Za-z0-9]{10,200}/;
const TEMPLATE_KITS = { 'credit-letter-kit': ['credit-letter-kit'], 'letter-of-explanation': ['letter-of-explanation-kit'] };
const BUNDLE_SKU = 'complete-approvalprep-bundle';
/** What a website order holds in the app: the letter kits filled in here, and the website files. */
export function orderContents(sku) {
  if (sku === BUNDLE_SKU) return { templates: ['credit-letter-kit', 'letter-of-explanation-kit'], files: Object.keys(APP_FILE_KITS), bundle: true };
  if (!Object.hasOwn(APP_FILE_KITS, sku)) return null;
  return { templates: TEMPLATE_KITS[sku] ?? [], files: [sku], bundle: false };
}
export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY || !env.DOWNLOAD_SIGNING_SECRET || !env.PRODUCT_ASSETS_R2 || !env.PRODUCTS_DB) return appJson({ stop: 'WEBSITE_UNLOCK_NOT_READY' }, 503);
  const refused = () => appJson({ error: 'ORDER_NOT_FOUND' }, 403);
  try {
    if (!await withinLimit(env.PRODUCTS_DB, `app-website:ip:${await sha256(clientIp(request))}`, 10, HOUR)) return appJson({ error: 'TOO_MANY_REQUESTS' }, 429);
    const body = await request.json().catch(() => ({}));
    const sessionId = ORDER_RE.exec(String(body?.order ?? ''))?.[0];
    if (!sessionId) return refused();
    const order = await paidOrder(env, sessionId);
    const contents = order && orderContents(order.sku);
    if (!contents) return refused();
    const assets = env.PRODUCT_ASSETS_R2;
    const kits = await Promise.all(contents.templates.map(async kit => (await assets.get(`app-kits/${kit}.json`))?.json()));
    const heads = await Promise.all(contents.files.flatMap(kit => FILE_TYPES.map(type => assets.head(fileKey(kit, type)))));
    const archive = contents.bundle ? await assets.head('app-kits/complete-approvalprep-bundle.zip') : null;
    if (kits.some(k => !k) || heads.some(h => !h || !(h.size > 0)) || (contents.bundle && !(archive?.size > 0))) return appJson({ stop: 'WEBSITE_UNLOCK_ASSET_MISSING' }, 503);
    const origin = new URL(request.url).origin;
    const files = await Promise.all(contents.files.map(async kit => ({ kit, files: await Promise.all(FILE_TYPES.map(async type => ({ type, url: await signedFileUrl(origin, env.DOWNLOAD_SIGNING_SECRET, kit, type) }))) })));
    return appJson({ sku: order.sku, kits, files, ...(contents.bundle ? { archiveUrl: await bundleUrl(origin, env.DOWNLOAD_SIGNING_SECRET) } : {}) });
  } catch { return refused(); }
}
