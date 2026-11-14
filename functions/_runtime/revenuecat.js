// RevenueCat v2: the only API the project's secret key works on. RevenueCat refuses a v2 secret key on
// GET /v1/subscribers (real reply 14 Nov 2026: 403, code 7723; tests/fixtures/revenuecat), so the doors
// read the buyer's purchases and resolve each to its store product ID through the product list.
// APPROVALPREP_REVENUECAT_SECRET is the ApprovalPrep project's v2 secret key (vault REVENUECAT_AP_V2_SECRET_KEY).
export const REVENUECAT_PROJECT = 'projf63ea019'; // project "ApprovalPrep": an identifier, not a secret
const RC = `https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT}`;
const record = v => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** Real reply bodies -> [{ id, product, store, environment, status }]; anything malformed is dropped. */
export function storePurchases(purchases, products) {
  const storeIds = new Map();
  for (const p of Array.isArray(record(products).items) ? record(products).items.map(record) : []) {
    if (typeof p.id === 'string' && typeof p.store_identifier === 'string') storeIds.set(p.id, p.store_identifier);
  }
  const list = record(purchases).items;
  return (Array.isArray(list) ? list : []).map(record).flatMap(p => {
    const product = typeof p.product_id === 'string' ? storeIds.get(p.product_id) : undefined;
    return product && typeof p.id === 'string' && p.id
      ? [{ id: p.id, product, store: String(p.store), environment: String(p.environment), status: String(p.status) }] : [];
  });
}

/** { purchases } for a known buyer; { purchases: [] } for an unknown one or any upstream failure (the
 * doors answer those identically); { stop } when RevenueCat refuses our key, which is never her fault. */
export async function revenueCatPurchases(id, secret) {
  const get = path => fetch(`${RC}${path}`, { headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' }, signal: AbortSignal.timeout(10000), redirect: 'error' });
  const [purchases, products] = await Promise.all([get(`/customers/${encodeURIComponent(id)}/purchases?limit=1000`), get('/products?limit=1000')]);
  if ([purchases, products].some(r => r.status === 401 || r.status === 403)) {
    console.error(JSON.stringify({ event: 'NAMED_STOP', stop: 'REVENUECAT_KEY_REJECTED', where: 'app-doors' }));
    return { stop: 'REVENUECAT_KEY_REJECTED' };
  }
  if (!purchases.ok || !products.ok) return { purchases: [] };
  const [p, q] = await Promise.all([purchases.json(), products.json()]);
  if (record(p).next_page || record(q).next_page) return { purchases: [] };
  return { purchases: storePurchases(p, q) };
}
