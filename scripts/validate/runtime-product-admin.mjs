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
console.log('PASS runtime-product-admin');
