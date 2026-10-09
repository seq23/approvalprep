import fs from 'node:fs';
const fail=(m)=>{console.error(`FAIL runtime-product-admin: ${m}`); process.exit(1)};
const need=(p)=>{if(!fs.existsSync(p)) fail(`missing ${p}`)};
['data/products/seed_product_registry.json','migrations/0001_runtime_product_admin.sql','functions/_runtime/admin.js','functions/_runtime/catalog.js','functions/api/admin/products.js','functions/api/admin/upload.js','functions/api/admin/product-revoke.js','functions/api/download-file.js','docs/products/LIVE_PRODUCT_CATALOG.md','docs/products/PRODUCT_ADMIN_RUNBOOK.md'].forEach(need);
const seed=JSON.parse(fs.readFileSync('data/products/seed_product_registry.json','utf8'));
if(seed.schemaVersion!=='4.3.0') fail('seed schemaVersion must be 4.3.0');
if(!Array.isArray(seed.products)||seed.products.length!==8) fail('seed must contain 8 paid products');
const slugs=new Set();
for(const p of seed.products){ if(slugs.has(p.slug)) fail(`duplicate slug ${p.slug}`); slugs.add(p.slug); if(p.status==='live'){ ['stripeLivePriceId','stripeTestPriceId','imageKey','pdfKey','docxKey'].forEach(k=>{ if(!p[k]) fail(`live product ${p.slug} missing ${k}`); }); }}
const admin=fs.readFileSync('src/pages/admin.astro','utf8');
['/api/admin/login','/api/admin/products','/api/admin/upload','revoke'].forEach(s=>{if(!admin.includes(s)) fail(`admin UI missing ${s}`)});
const wrangler=fs.readFileSync('wrangler.toml','utf8');
['PRODUCTS_DB','PRODUCTS_KV','PRODUCT_ASSETS_R2'].forEach(s=>{if(!wrangler.includes(s)) fail(`wrangler missing ${s}`)});
const catalog=fs.readFileSync('functions/_runtime/catalog.js','utf8');
['try {','catch','seedProducts().filter','return seedProducts().find'].forEach(s=>{if(!catalog.includes(s)) fail(`catalog missing runtime fallback ${s}`)});
// One price per kit everywhere (8 Oct 2026 repricing). The displayed label
// (data/products/products.json), the D1 seed and the runtime fallback seed
// must agree, or checkout charges a different price than the page shows.
const display=JSON.parse(fs.readFileSync('data/products/products.json','utf8')).products;
const runtimeSrc=fs.readFileSync('functions/_runtime/seed-products.js','utf8');
const runtimeSeed=JSON.parse(runtimeSrc.slice(runtimeSrc.indexOf('{'), runtimeSrc.lastIndexOf('}')+1));
for(const p of seed.products){
  const label=display.find(d=>d.sku===p.slug)?.priceLabel;
  if(label!==`$${p.priceCents/100}`) fail(`${p.slug}: products.json shows ${label}, seed charges $${p.priceCents/100}`);
  const r=runtimeSeed.products.find(x=>x.slug===p.slug);
  if(!r||r.priceCents!==p.priceCents||r.stripeLivePriceId!==p.stripeLivePriceId||r.stripeTestPriceId!==p.stripeTestPriceId) fail(`${p.slug}: functions/_runtime/seed-products.js disagrees with seed_product_registry.json`);
  if(p.priceCents>4900) fail(`${p.slug}: $${p.priceCents/100} is above the $49 ceiling set on 8 Oct 2026`);
}
// ...and every surface a customer reads: the paid PDF/DOCX kit files, site
// source and content data, Functions copy (emails), public/ and, when built, the
// rendered pages with their JSON-LD. #41 left $39-$249 on the Amazon landing
// pages because nothing here looked past the three seeds.
const { sweepKitPrices, customerSurfaces } = await import('./_kit_price_surfaces.mjs');
const { publishedDir } = await import('./_common.mjs');
const surfaces = customerSurfaces({ buildDir: publishedDir() });
const sweep = sweepKitPrices(seed.products, surfaces);
if (sweep.downloadsRead < seed.products.length * 2) fail(`kit price sweep read ${sweep.downloadsRead} PDF/DOCX kit files, expected ${seed.products.length * 2}`);
if (sweep.mentionsChecked === 0) fail('kit price sweep matched no kit price on any surface; the sweep is not reading what it governs');
if (sweep.problems.length) fail(`kit price shown on a customer surface disagrees with the seed:\n  ${sweep.problems.slice(0, 40).join('\n  ')}`);
console.log(`PASS runtime-product-admin (kit prices: ${sweep.mentionsChecked} mentions across ${sweep.filesRead} files, ${sweep.downloadsRead} kit downloads read)`);
