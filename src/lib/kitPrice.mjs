// The one price per kit is priceCents in data/products/seed_product_registry.json: the D1 seed,
// and the amount the kit's Stripe price charges. Every price a buyer reads (cards, buttons,
// JSON-LD, llms.txt, the app) is built here from it; no data file types a price.
// Guarded by validate:runtime-product-admin (any typed price field that disagrees fails).
export const priceLabelFromCents = (cents) => `$${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;

// Products from data/products/products.json, with priceLabel and (for a paid kit) the buy
// button's cta_label built from the seed; only the free product types its own button. A paid product with no seed price throws:
// it would otherwise render with no price, or a guessed one.
export function withSeedPrices(products, seedProducts) {
  const cents = new Map(seedProducts.map((p) => [p.slug, p.priceCents]));
  return products.map((product) => {
    if (product.status === "free") return { ...product, priceLabel: "Free" };
    if (!cents.has(product.sku)) throw new Error(`kitPrice: ${product.sku} has no price in seed_product_registry.json`);
    const priceLabel = priceLabelFromCents(cents.get(product.sku));
    return { ...product, priceLabel, cta_label: `Buy ${product.name} — ${priceLabel}` };
  });
}

// Copy kept as data (data/content/*.json) names a price as {price:<sku>}, never "$29": the
// token is filled here from the seed when the page is built. An unknown sku throws, so a page
// can never render a token or a guessed price.
const PRICE_TOKEN = /\{price:([a-z0-9-]+)\}/g;
export function fillPrices(value, seedProducts) {
  const cents = new Map(seedProducts.map((p) => [p.slug, p.priceCents]));
  const fill = (v) => {
    if (typeof v === "string") return v.replace(PRICE_TOKEN, (_, sku) => {
      if (!cents.has(sku)) throw new Error(`kitPrice: {price:${sku}} names no kit in seed_product_registry.json`);
      return priceLabelFromCents(cents.get(sku));
    });
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]));
    return v;
  };
  return fill(value);
}
