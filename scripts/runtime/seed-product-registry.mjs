import fs from 'node:fs';
const seed = JSON.parse(fs.readFileSync('data/products/seed_product_registry.json', 'utf8'));
function q(value){ return value == null ? 'NULL' : `'${String(value).replaceAll("'","''")}'`; }
function upsert(product){
  const columns = ['id','slug','name','short_description','long_description','price_cents','currency','status','visibility','featured_rank','is_best_value','stripe_live_product_id','stripe_live_price_id','stripe_test_product_id','stripe_test_price_id','image_asset_id','pdf_asset_id','docx_asset_id','created_at','updated_at','published_at','revoked_at','revoked_reason'];
  const values = [
    product.id, product.slug, product.name, product.shortDescription || '', product.longDescription || '', product.priceCents || 0, product.currency || 'usd',
    product.status || 'draft', product.visibility || 'private', product.featuredRank || 100, product.isBestValue ? 1 : 0,
    product.stripeLiveProductId || '', product.stripeLivePriceId || '', product.stripeTestProductId || '', product.stripeTestPriceId || '',
    product.imageKey || '', product.pdfKey || '', product.docxKey || '', product.createdAt || new Date().toISOString(), new Date().toISOString(),
    product.publishedAt || null, product.revokedAt || null, product.revokedReason || null
  ];
  const updates = columns.filter((column) => column !== 'id').map((column) => `${column}=excluded.${column}`).join(',');
  return `INSERT INTO products (${columns.join(',')}) VALUES (${values.map(q).join(',')}) ON CONFLICT(id) DO UPDATE SET ${updates};`;
}
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(seed, null, 2));
} else {
  console.log(seed.products.map(upsert).join('\n'));
}
