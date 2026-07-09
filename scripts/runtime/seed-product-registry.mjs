import fs from 'node:fs';
const seed = JSON.parse(fs.readFileSync('data/products/seed_product_registry.json', 'utf8'));
console.log(JSON.stringify(seed, null, 2));
