#!/usr/bin/env node
import fs from 'node:fs';
const products = JSON.parse(fs.readFileSync('data/products/products.json','utf8')).products;
const active = products.filter(p=>p.status === 'active_paid' && p.stripe_enabled);
if (active.length !== 8) { console.error(`[product-model] expected 8 active paid products, found ${active.length}`); process.exit(1); }
const offerings = new Set(active.flatMap(p=>p.included_offerings || []));
if (offerings.size < 30) { console.error(`[product-model] expected at least 30 included offerings, found ${offerings.size}`); process.exit(1); }
for (const p of active) {
  if (!p.stripe_price_env?.startsWith('STRIPE_PRICE_')) { console.error(`[product-model] ${p.sku} missing stripe_price_env`); process.exit(1); }
  if (!p.cta_label || !p.description || !p.trust_signals || p.trust_signals.length < 4) { console.error(`[product-model] ${p.sku} missing conversion fields`); process.exit(1); }
  if (p.delivery_model !== 'direct_paid_download' || p.studio_required !== false) { console.error(`[product-model] ${p.sku} must be direct paid download and not Studio-gated`); process.exit(1); }
  if (!/direct paid download/i.test(p.description)) { console.error(`[product-model] ${p.sku} description must state direct paid download`); process.exit(1); }
}
console.log(`[product-model] OK: ${active.length} active products cover ${offerings.size} offerings`);
