const allowedSkus = new Set([
  "letter-of-explanation",
  "income-employment-letter-kit",
  "credit-letter-kit",
  "rental-application-kit",
  "loan-prep-letter-kit",
  "business-funding-prep-kit",
  "life-admin-letter-kit",
  "complete-approvalprep-bundle"
]);

const skuPriceEnv = {
  "letter-of-explanation": "STRIPE_PRICE_LETTER_OF_EXPLANATION",
  "income-employment-letter-kit": "STRIPE_PRICE_INCOME_EMPLOYMENT_KIT",
  "credit-letter-kit": "STRIPE_PRICE_CREDIT_LETTER_KIT",
  "rental-application-kit": "STRIPE_PRICE_RENTAL_APPLICATION_KIT",
  "loan-prep-letter-kit": "STRIPE_PRICE_LOAN_PREP_KIT",
  "business-funding-prep-kit": "STRIPE_PRICE_BUSINESS_FUNDING_PREP_KIT",
  "life-admin-letter-kit": "STRIPE_PRICE_LIFE_ADMIN_LETTER_KIT",
  "complete-approvalprep-bundle": "STRIPE_PRICE_COMPLETE_APPROVALPREP_BUNDLE"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function priceFor(env, sku) {
  const direct = env[skuPriceEnv[sku]] || "";
  if (direct) return direct;
  const raw = env.STRIPE_PRICE_MAP || "{}";
  try { return JSON.parse(raw)[sku] || ""; } catch { return ""; }
}


function downloadManifestFor(sku, sessionId) {
  return {
    sku,
    verified: true,
    delivery: "entitlement_protected_download",
    files: [
      `/api/download-file?session_id=${encodeURIComponent(sessionId)}&type=pdf`,
      `/api/download-file?session_id=${encodeURIComponent(sessionId)}&type=docx`
    ],
    requiredSections: ["What this is", "When to use it", "What to review before sending", "What to attach", "Where to send it", "What to do next", "What this does not do"]
  };
}

async function recordVerifiedEntitlement(env, session, sku) {
  if (!env.PRODUCTS_DB) return;
  const existing = await env.PRODUCTS_DB.prepare("SELECT id FROM download_entitlements WHERE stripe_session_id=?").bind(session.id).first();
  const id = existing?.id || crypto.randomUUID();
  await env.PRODUCTS_DB.prepare("INSERT OR REPLACE INTO download_entitlements (id,stripe_session_id,product_id,customer_email,payment_status,amount_total,currency,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(
    id,
    session.id,
    sku,
    "",
    session.payment_status || "unknown",
    session.amount_total || 0,
    session.currency || "usd",
    new Date().toISOString(),
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  ).run();
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const sku = String(body.sku || "");
  const sessionId = String(body.session_id || "");
  if (!allowedSkus.has(sku)) return json({ error: "Unknown SKU" }, 400);
  if (!context.env.STRIPE_SECRET_KEY) return json({ status: "NOT_CONFIGURED", message: "Stripe secret is missing. Download cannot be verified until Stripe payment is verified.", sku }, 501);
  if (!sessionId) return json({ status: "NOT_VERIFIED", message: "Missing Stripe session id.", sku }, 403);

  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ status: "SOURCE_ERROR", provider: "stripe", message: data.error?.message || "Stripe verification failed." }, 502);
  const paidSku = data.metadata?.sku || data.metadata?.product_id || data.client_reference_id || "";
  if (data.payment_status !== "paid" || paidSku !== sku) return json({ status: "NOT_VERIFIED", message: "Stripe payment is verified only when Stripe returns paid status for this SKU.", sku }, 403);
  await recordVerifiedEntitlement(context.env, data, sku);
  return json({ status: "VERIFIED", ...downloadManifestFor(sku, sessionId) });
}
