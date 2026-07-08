import { seed } from './seed-products.js';
import { nowIso } from './responses.js';
export const PUBLIC_CACHE_KEY = 'approvalprep:public-product-catalog:v4.3.0';
export function normalizeSeedProduct(p) {
  return { id:p.id, slug:p.slug, name:p.name, shortDescription:p.shortDescription || '', longDescription:p.longDescription || '', priceCents:p.priceCents || 0, currency:p.currency || 'usd', status:p.status || 'draft', visibility:p.visibility || 'private', featuredRank:p.featuredRank || 100, isBestValue:!!p.isBestValue, stripeLiveProductId:p.stripeLiveProductId || '', stripeLivePriceId:p.stripeLivePriceId || '', stripeTestProductId:p.stripeTestProductId || '', stripeTestPriceId:p.stripeTestPriceId || '', imageKey:p.imageKey || '', pdfKey:p.pdfKey || '', docxKey:p.docxKey || '', publicImagePath:p.publicImagePath || '', staticPdfPath:p.staticPdfPath || '', staticDocxPath:p.staticDocxPath || '', includes:p.includes || [], notFor:p.notFor || [], createdAt:p.createdAt || nowIso(), updatedAt:p.updatedAt || nowIso(), publishedAt:p.publishedAt || null, revokedAt:p.revokedAt || null, revokedReason:p.revokedReason || null };
}
export function seedProducts(){ return seed.products.map(normalizeSeedProduct); }
export function publicProduct(p){ return { id:p.id, slug:p.slug, name:p.name, shortDescription:p.short_description ?? p.shortDescription, longDescription:p.long_description ?? p.longDescription, priceCents:p.price_cents ?? p.priceCents, currency:p.currency, status:p.status, isBestValue:!!(p.is_best_value ?? p.isBestValue), imageUrl:p.publicImagePath || p.public_image_path || `/assets/products/${p.slug}.png`, includes:p.includes || [], notFor:p.notFor || [] }; }
export async function listD1Products(env, includeNonLive=false){
  if (!env.PRODUCTS_DB) return seedProducts();
  const q = includeNonLive ? 'SELECT * FROM products ORDER BY featured_rank ASC, price_cents ASC' : "SELECT * FROM products WHERE status='live' AND visibility='public' ORDER BY featured_rank ASC, price_cents ASC";
  const res = await env.PRODUCTS_DB.prepare(q).all();
  if (!res.results || !res.results.length) return seedProducts().filter(p=> includeNonLive || (p.status==='live' && p.visibility==='public'));
  return res.results;
}
export async function getProductBySlug(env, slug){
  if (env.PRODUCTS_DB){ const row = await env.PRODUCTS_DB.prepare('SELECT * FROM products WHERE slug=?').bind(slug).first(); if (row) return row; }
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
