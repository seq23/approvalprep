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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function downloadManifestFor(sku, sessionId, extras = {}) {
  return {
    sku,
    verified: true,
    delivery: "entitlement_protected_download",
    files: [
      `/api/download-file?session_id=${encodeURIComponent(sessionId)}&type=pdf`,
      `/api/download-file?session_id=${encodeURIComponent(sessionId)}&type=docx`
    ],
    studio: "/letter-writing-studio",
    requiredSections: ["What this is", "When to use it", "What to review before sending", "What to attach", "Where to send it", "What to do next", "What this does not do"],
    ...extras
  };
}

async function findPaidEntitlement(env, sessionId, sku) {
  if (!env.PRODUCTS_DB) return { entitlement: null, warning: "PRODUCTS_DB binding missing; using Stripe verification fallback." };
  try {
    const ent = await env.PRODUCTS_DB.prepare(
      "SELECT product_id,payment_status,expires_at,revoked_at FROM download_entitlements WHERE stripe_session_id=? AND revoked_at IS NULL"
    ).bind(sessionId).first();
    if (!ent) return { entitlement: null };
    if (ent.payment_status !== "paid") return { entitlement: null };
    if (ent.product_id !== sku) return { entitlement: null };
    if (ent.expires_at && new Date(ent.expires_at) < new Date()) return { entitlement: null };
    return { entitlement: ent };
  } catch (error) {
    return { entitlement: null, warning: `Entitlement lookup failed; using Stripe verification fallback. ${error?.message || "Unknown D1 error"}` };
  }
}

async function recordVerifiedEntitlement(env, session, sku) {
  if (!env.PRODUCTS_DB) return { recorded: false, warning: "PRODUCTS_DB binding missing; entitlement was not stored." };
  try {
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
    return { recorded: true };
  } catch (error) {
    return { recorded: false, warning: `Entitlement write failed; download-file will verify directly with Stripe. ${error?.message || "Unknown D1 error"}` };
  }
}

async function fetchStripeSession(env, sessionId) {
  if (!env.STRIPE_SECRET_KEY) return { ok: false, status: 501, body: { status: "NOT_CONFIGURED", message: "Stripe secret is missing. Please contact info@approvalprep.com with your Stripe receipt." } };
  let res;
  try {
    res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
    });
  } catch (error) {
    return { ok: false, status: 502, body: { status: "SOURCE_ERROR", provider: "stripe", message: `Stripe verification request failed. ${error?.message || "Unknown fetch error"}` } };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: 502, body: { status: "SOURCE_ERROR", provider: "stripe", message: data.error?.message || "Stripe verification failed. Please contact info@approvalprep.com with your Stripe receipt." } };
  return { ok: true, data };
}

function stripeSessionProduct(session) {
  return session.metadata?.sku || session.metadata?.product_id || session.client_reference_id || "";
}

function stripeSessionIsComplete(session) {
  const isPaid = session.payment_status === "paid";
  const isZeroDollarPromotion = session.payment_status === "no_payment_required" && session.status === "complete" && Number(session.amount_total || 0) === 0;
  return { isPaid, isZeroDollarPromotion, ok: isPaid || isZeroDollarPromotion };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const sku = String(body.sku || "");
    const sessionId = String(body.session_id || "");
    if (!allowedSkus.has(sku)) return json({ error: "Unknown SKU" }, 400);
    if (!sessionId) return json({ status: "NOT_VERIFIED", message: "Missing Stripe session id.", sku }, 403);

    const entitlementResult = await findPaidEntitlement(context.env, sessionId, sku);
    if (entitlementResult.entitlement) return json({ status: "VERIFIED", source: "entitlement", ...downloadManifestFor(sku, sessionId) });

    const stripe = await fetchStripeSession(context.env, sessionId);
    if (!stripe.ok) return json({ ...stripe.body, sku, warning: entitlementResult.warning || undefined }, stripe.status);

    const paidSku = stripeSessionProduct(stripe.data);
    if (paidSku !== sku) {
      return json({
        status: "SKU_MISMATCH",
        message: "This Stripe session does not match the requested product. Contact info@approvalprep.com with your Stripe receipt and session id.",
        sku,
        paidSku
      }, 409);
    }

    const completion = stripeSessionIsComplete(stripe.data);
    if (!completion.ok) {
      const checkoutStatus = String(stripe.data.status || "");
      const paymentStatus = String(stripe.data.payment_status || "unknown");
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

    const record = await recordVerifiedEntitlement(context.env, stripe.data, sku);
    return json({
      status: "VERIFIED",
      source: completion.isZeroDollarPromotion ? "stripe_zero_dollar_promotion" : "stripe",
      entitlementRecorded: record.recorded,
      warning: record.warning || entitlementResult.warning || undefined,
      ...downloadManifestFor(sku, sessionId)
    });
  } catch (error) {
    return json({ status: "VERIFY_DOWNLOAD_EXCEPTION", message: error?.message || "Unknown verify-download exception" }, 500);
  }
}
