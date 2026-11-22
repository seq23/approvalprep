// The one price per kit is priceCents in data/products/seed_product_registry.json: the D1 seed,
// and the amount the kit's Stripe price charges. Every price a buyer reads (cards, buttons,
// JSON-LD, llms.txt, the app) is built here from it; no data file types a price.
// Guarded by validate:runtime-product-admin (any typed price field that disagrees fails).
export const priceLabelFromCents = (cents) => `$${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;

// Products from data/products/products.json, with priceLabel (and, for a paid kit with no
// typed button, cta_label) filled from the seed. A paid product with no seed price throws:
// it would otherwise render with no price, or a guessed one.
export function withSeedPrices(products, seedProducts) {
  const cents = new Map(seedProducts.map((p) => [p.slug, p.priceCents]));
  return products.map((product) => {
    if (product.status === "free") return { ...product, priceLabel: "Free" };
    if (!cents.has(product.sku)) throw new Error(`kitPrice: ${product.sku} has no price in seed_product_registry.json`);
    const priceLabel = priceLabelFromCents(cents.get(product.sku));
    return { ...product, priceLabel, cta_label: product.cta_label ?? `Buy ${product.name} — ${priceLabel}` };
  });
}
