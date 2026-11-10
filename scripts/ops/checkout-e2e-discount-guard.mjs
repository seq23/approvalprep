// Decides whether the checkout E2E may exercise a discount code.
// A 100%-off code in LIVE Stripe gives every kit away to anyone who learns it, so the discount path
// runs only against Stripe TEST mode (session ids start "cs_test_") and only with a code the operator
// passed in. Anything else is a named skip, never a run.
export function discountCheckDecision({ code, fullPriceSessionId }) {
  if (!String(code || "").trim()) return { run: false, reason: "DISCOUNT_SKIPPED_NO_CODE_GIVEN" };
  if (!String(fullPriceSessionId || "").startsWith("cs_test_")) return { run: false, reason: "DISCOUNT_REFUSED_NOT_STRIPE_TEST_MODE" };
  return { run: true, reason: "STRIPE_TEST_MODE" };
}
