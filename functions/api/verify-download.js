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

async function findPaidEntitlement(env, sessionId, sku) {
  if (!env.PRODUCTS_DB) return null;
  const ent = await env.PRODUCTS_DB.prepare(
    "SELECT product_id,payment_status,expires_at,revoked_at FROM download_entitlements WHERE stripe_session_id=? AND revoked_at IS NULL"
  ).bind(sessionId).first();
  if (!ent) return null;
  if (ent.payment_status !== "paid") return null;
  if (ent.product_id !== sku) return null;
  if (ent.expires_at && new Date(ent.expires_at) < new Date()) return null;
  return ent;
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
    session.payment_status === "no_payment_required" ? "paid" : (session.payment_status || "unknown"),
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
  if (!sessionId) return json({ status: "NOT_VERIFIED", message: "Missing Stripe session id.", sku }, 403);

  const entitlement = await findPaidEntitlement(context.env, sessionId, sku);
  if (entitlement) return json({ status: "VERIFIED", source: "entitlement", ...downloadManifestFor(sku, sessionId) });

  if (!context.env.STRIPE_SECRET_KEY) return json({ status: "NOT_CONFIGURED", message: "Stripe secret is missing and no paid entitlement was found yet. Please contact info@approvalprep.com with your Stripe receipt.", sku }, 501);

  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ status: "SOURCE_ERROR", provider: "stripe", message: data.error?.message || "Stripe verification failed. Please contact info@approvalprep.com with your Stripe receipt.", sku }, 502);
  const paidSku = data.metadata?.sku || data.metadata?.product_id || data.client_reference_id || "";
  if (paidSku !== sku) {
    return json({
      status: "SKU_MISMATCH",
      message: "This Stripe session does not match the requested product. Contact info@approvalprep.com with your Stripe receipt and session id.",
      sku
    }, 409);
  }
  const isPaid = data.payment_status === "paid";
  const isZeroDollarPromotion = data.payment_status === "no_payment_required" && data.status === "complete" && Number(data.amount_total || 0) === 0;
  if (!isPaid && !isZeroDollarPromotion) {
    const checkoutStatus = String(data.status || "");
    const paymentStatus = String(data.payment_status || "unknown");
    if (checkoutStatus === "open" || checkoutStatus === "expired" || paymentStatus === "unpaid") {
      return json({
        status: "PAYMENT_NOT_COMPLETED",
        message: "Stripe has not confirmed this checkout session as paid yet. If Stripe shows a completed payment, contact info@approvalprep.com with the receipt and session id so access can be resolved.",
        sku,
        checkoutStatus,
        paymentStatus
      }, 402);
    }
    return json({
      status: "PAYMENT_PENDING",
      message: "Stripe is still confirming the payment. This page will retry automatically for a short time.",
      sku,
      checkoutStatus,
      paymentStatus
    }, 202);
  }
  await recordVerifiedEntitlement(context.env, data, sku);
  return json({ status: "VERIFIED", source: isZeroDollarPromotion ? "stripe_zero_dollar_promotion" : "stripe", ...downloadManifestFor(sku, sessionId) });
}
