import { seed } from './seed-products.js';
import { nowIso } from './responses.js';
export const PUBLIC_CACHE_KEY = 'approvalprep:public-product-catalog:v4.3.0';
export function normalizeSeedProduct(p) {
  return { id:p.id, slug:p.slug, name:p.name, shortDescription:p.shortDescription || '', longDescription:p.longDescription || '', priceCents:p.priceCents || 0, currency:p.currency || 'usd', status:p.status || 'draft', visibility:p.visibility || 'private', featuredRank:p.featuredRank || 100, isBestValue:!!p.isBestValue, stripeLiveProductId:p.stripeLiveProductId || '', stripeLivePriceId:p.stripeLivePriceId || '', stripeTestProductId:p.stripeTestProductId || '', stripeTestPriceId:p.stripeTestPriceId || '', imageKey:p.imageKey || '', pdfKey:p.pdfKey || '', docxKey:p.docxKey || '', publicImagePath:p.publicImagePath || '', staticPdfPath:p.staticPdfPath || '', staticDocxPath:p.staticDocxPath || '', includes:p.includes || [], notFor:p.notFor || [], createdAt:p.createdAt || nowIso(), updatedAt:p.updatedAt || nowIso(), publishedAt:p.publishedAt || null, revokedAt:p.revokedAt || null, revokedReason:p.revokedReason || null };
}
export function seedProducts(){ return seed.products.map(normalizeSeedProduct); }
export function normalizeRuntimeProduct(p) {
  if (!p) return null;
  const fallback = seedProducts().find((item) => item.slug === p.slug || item.id === p.id) || {};
  return {
    ...fallback,
    ...p,
    id: p.id || fallback.id,
    slug: p.slug || fallback.slug,
    name: p.name || fallback.name,
    shortDescription: p.short_description ?? p.shortDescription ?? fallback.shortDescription ?? '',
    longDescription: p.long_description ?? p.longDescription ?? fallback.longDescription ?? '',
    priceCents: p.price_cents ?? p.priceCents ?? fallback.priceCents ?? 0,
    status: p.status || fallback.status || 'draft',
    visibility: p.visibility || fallback.visibility || 'private',
    stripeLiveProductId: p.stripe_live_product_id || p.stripeLiveProductId || fallback.stripeLiveProductId || '',
    stripeLivePriceId: p.stripe_live_price_id || p.stripeLivePriceId || fallback.stripeLivePriceId || '',
    stripeTestProductId: p.stripe_test_product_id || p.stripeTestProductId || fallback.stripeTestProductId || '',
    stripeTestPriceId: p.stripe_test_price_id || p.stripeTestPriceId || fallback.stripeTestPriceId || '',
    publicImagePath: p.public_image_path || p.publicImagePath || fallback.publicImagePath || '',
    staticPdfPath: p.static_pdf_path || p.staticPdfPath || fallback.staticPdfPath || '',
    staticDocxPath: p.static_docx_path || p.staticDocxPath || fallback.staticDocxPath || '',
    includes: p.includes || fallback.includes || [],
    notFor: p.notFor || fallback.notFor || []
  };
}
export function publicProduct(p){ const normalized = normalizeRuntimeProduct(p); return { id:normalized.id, slug:normalized.slug, name:normalized.name, shortDescription:normalized.shortDescription, longDescription:normalized.longDescription, priceCents:normalized.priceCents, currency:normalized.currency, status:normalized.status, isBestValue:!!(normalized.is_best_value ?? normalized.isBestValue), imageUrl:normalized.publicImagePath || `/assets/products/${normalized.slug}.png`, includes:normalized.includes || [], notFor:normalized.notFor || [] }; }
export async function listD1Products(env, includeNonLive=false){
  if (!env.PRODUCTS_DB) return seedProducts();
  const q = includeNonLive ? 'SELECT * FROM products ORDER BY featured_rank ASC, price_cents ASC' : "SELECT * FROM products WHERE status='live' AND visibility='public' ORDER BY featured_rank ASC, price_cents ASC";
  const res = await env.PRODUCTS_DB.prepare(q).all();
  if (!res.results || !res.results.length) return seedProducts().filter(p=> includeNonLive || (p.status==='live' && p.visibility==='public'));
  return res.results.map(normalizeRuntimeProduct);
}
export async function getProductBySlug(env, slug){
  if (env.PRODUCTS_DB){ const row = await env.PRODUCTS_DB.prepare('SELECT * FROM products WHERE slug=?').bind(slug).first(); if (row) return normalizeRuntimeProduct(row); }
  return seedProducts().find(p=>p.slug===slug) || null;
}
export async function refreshPublicCache(env){
  const products = await listD1Products(env,false);
  const payload = { schemaVersion:'4.3.0', generatedAt:nowIso(), products: products.map(publicProduct) };
  if (env.PRODUCTS_KV) await env.PRODUCTS_KV.put(PUBLIC_CACHE_KEY, JSON.stringify(payload));
  return payload;
}
export async function readPublicCatalog(env){
  if (env.PRODUCTS_KV){ const cached = await env.PRODUCTS_KV.get(PUBLIC_CACHE_KEY, 'json'); if (cached?.products?.length) return cached; }
  return refreshPublicCache(env);
}
