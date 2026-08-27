#!/usr/bin/env node
// Fails if the R2 key a purchase resolves cannot be constructed by the same
// rule the uploader writes with.
//
// Three conventions for the same object used to coexist:
//   functions/_runtime/seed-products.js  read   downloads/<slug>.<ext>
//   scripts/ops/r2-upload-assets.mjs     wrote  products/<slug>/<file>
//   functions/api/admin/upload.js        wrote  products/<slug>/<type>/<ts>-<name>
// Measured against the live bucket on 2026-08-27, only the second exists there.
// The first pointed at a prefix that has never held an object, so any request
// that fell through to it returned R2_OBJECT_MISSING to a paying customer.
//
// This drives the real functions/api/download-file.js handler with stub
// bindings and asserts the key it asks R2 for is one productAssetKey() would
// produce. It runs the fallback path too - the case where D1 gives the resolver
// nothing - because that is exactly the path the old code got wrong and the
// path no happy-case test would ever reach.
import fs from 'node:fs';
import { productAssetKey, isProductAssetKey, DOWNLOAD_TYPES } from '../../functions/_runtime/asset-keys.js';
import { onRequestGet as downloadFile } from '../../functions/api/download-file.js';
import { seed } from '../../functions/_runtime/seed-products.js';

const failures = [];
const fail = (msg) => failures.push(msg);

const liveProducts = seed.products.filter((p) => p.status === 'live');
if (!liveProducts.length) fail('seed registry declares no live products');

// 1. The seed registry's declared keys must obey the rule. The runtime uses
//    these directly as its first choice, so a wrong value here is a live 404.
for (const product of liveProducts) {
  for (const type of DOWNLOAD_TYPES) {
    const declared = type === 'docx' ? product.docxKey : product.pdfKey;
    const expected = productAssetKey(product.slug, type);
    if (declared !== expected) fail(`seed ${product.slug} ${type}Key is ${declared || '(empty)'}; the uploader writes ${expected}`);
  }
}

// 2. The bulk uploader's key for each local seed-download file must be the same
//    key. This is the pair that has to agree: what gets written, what gets read.
const seedDir = 'seed-downloads';
if (fs.existsSync(seedDir)) {
  for (const file of fs.readdirSync(seedDir).filter((f) => /\.(pdf|docx)$/i.test(f))) {
    const sku = file.replace(/\.(pdf|docx)$/i, '');
    const type = file.split('.').pop().toLowerCase();
    const uploaderKey = productAssetKey(sku, type);
    if (!isProductAssetKey(uploaderKey, sku)) fail(`uploader would write a key the rule does not recognise: ${uploaderKey}`);
    const product = liveProducts.find((p) => p.slug === sku);
    if (product) {
      const readKey = type === 'docx' ? product.docxKey : product.pdfKey;
      if (readKey !== uploaderKey) fail(`uploader writes ${uploaderKey} but the runtime reads ${readKey}`);
    }
  }
}

// 3. Drive the real handler. `assetRow` null models D1 having no usable
//    product_assets row, which is when the resolver falls back to its own rule.
function stubEnv(product, assetRow) {
  const requested = [];
  const first = async (sql, args) => {
    if (sql.includes('FROM download_entitlements')) return { product_id: product.slug, payment_status: 'paid', expires_at: null, revoked_at: null };
    if (sql.includes('FROM products')) return { id: product.id, slug: product.slug, status: 'live', visibility: 'public' };
    if (sql.includes('FROM product_assets')) return assetRow;
    throw new Error(`unexpected query: ${sql}`);
  };
  const env = {
    PRODUCTS_DB: { prepare: (sql) => ({ bind: (...args) => ({ first: () => first(sql, args) }) }) },
    PRODUCT_ASSETS_R2: { get: async (key) => { requested.push(key); return { body: 'fixture-bytes' }; } }
  };
  return { env, requested };
}

for (const product of liveProducts) {
  for (const type of DOWNLOAD_TYPES) {
    const expected = productAssetKey(product.slug, type);
    const cases = [
      ['product_assets row present', { r2_key: expected, filename: `${product.slug}.${type}`, mime_type: 'application/pdf' }],
      ['product_assets row absent (fallback path)', null]
    ];
    for (const [label, assetRow] of cases) {
      const { env, requested } = stubEnv(product, assetRow);
      const request = new Request(`https://fixture.local/api/download-file?session_id=cs_fixture&type=${type}`);
      // eslint-disable-next-line no-await-in-loop
      const response = await downloadFile({ request, env });
      if (response.status !== 200) fail(`${product.slug} ${type} (${label}): handler returned ${response.status}, not the file`);
      if (requested.length !== 1) fail(`${product.slug} ${type} (${label}): handler made ${requested.length} R2 reads, expected 1`);
      const key = requested[0];
      if (!isProductAssetKey(key, product.slug)) fail(`${product.slug} ${type} (${label}): resolved key ${key} cannot be constructed by the uploader's rule`);
      if (key !== expected) fail(`${product.slug} ${type} (${label}): resolved ${key}, uploader writes ${expected}`);
    }
  }
}

if (failures.length) {
  console.error(`[download-key-contract] FAIL ${failures.length} problem(s)`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`[download-key-contract] OK products=${liveProducts.length} types=${DOWNLOAD_TYPES.join(',')} resolvedKeysMatchUploader=true fallbackPathChecked=true`);
