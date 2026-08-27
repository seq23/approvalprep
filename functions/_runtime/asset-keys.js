// The single rule for R2 object keys in approvalprep-product-assets.
//
// Measured against the live bucket on 2026-08-27: all 16 paid download objects
// (8 products x pdf/docx) are stored as products/<slug>/<slug>.<ext>. Nothing
// is stored under downloads/<slug>.<ext>, and nothing is stored under
// products/<slug>.png. Three different conventions existed in the code:
//
//   functions/_runtime/seed-products.js  read   downloads/<slug>.<ext>   (nothing there)
//   scripts/ops/r2-upload-assets.mjs     wrote  products/<slug>/<file>   (this is the bucket)
//   functions/api/admin/upload.js        wrote  products/<slug>/<type>/<ts>-<name>
//
// The bucket is the authority, so the uploader's convention wins. Every writer
// and every reader now derives its key here, so a future edit cannot make one
// half of the pair disagree with the other again.
//
// The key is deterministic rather than timestamped on purpose: a replacement
// upload overwrites the object the buyer actually receives instead of leaving
// the superseded copy behind as R2 storage nobody will ever serve.

export const DOWNLOAD_TYPES = ['pdf', 'docx'];
export const ASSET_TYPES = ['image', ...DOWNLOAD_TYPES];

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function extensionFor(assetType, filename) {
  if (assetType !== 'image') return assetType;
  const match = String(filename || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = match ? match[1] : '';
  return IMAGE_EXTENSIONS.has(ext) ? ext : 'png';
}

// productAssetKey('letter-of-explanation', 'pdf') -> 'products/letter-of-explanation/letter-of-explanation.pdf'
export function productAssetKey(slug, assetType, filename = '') {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) throw new Error('PRODUCT_SLUG_REQUIRED');
  if (!ASSET_TYPES.includes(assetType)) throw new Error(`UNSUPPORTED_ASSET_TYPE_${assetType}`);
  return `products/${cleanSlug}/${cleanSlug}.${extensionFor(assetType, filename)}`;
}

// True when `key` is a key this rule could have produced for `slug`. Used by the
// regression test to prove the key a purchase resolves is one the uploader
// would write, rather than merely a key that happens to exist today.
export function isProductAssetKey(key, slug) {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug || !key) return false;
  return ASSET_TYPES.some((assetType) =>
    assetType === 'image'
      ? [...IMAGE_EXTENSIONS].some((ext) => key === `products/${cleanSlug}/${cleanSlug}.${ext}`)
      : key === productAssetKey(cleanSlug, assetType)
  );
}
