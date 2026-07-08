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


function downloadManifestFor(sku) {
  return {
    sku,
    verified: true,
    delivery: "controlled_template_download",
    files: [
      `/downloads/${sku}.pdf`,
      `/downloads/${sku}.docx`
    ],
    requiredSections: ["What this is", "When to use it", "What to review before sending", "What to attach", "Where to send it", "What to do next", "What this does not do"]
  };
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
  if (data.payment_status !== "paid" || data.metadata?.sku !== sku) return json({ status: "NOT_VERIFIED", message: "Stripe payment is verified only when Stripe returns paid status for this SKU.", sku }, 403);
  return json({ status: "VERIFIED", ...downloadManifestFor(sku) });
}
