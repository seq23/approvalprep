# Checkout Proof And Smoke Tests

This document separates structural checkout readiness from live checkout proof.

## What The Repo Proves

- There are 8 active paid products in `data/products/products.json`.
- Every paid product is a direct paid download; the free Studio is optional and not required.
- Each active paid product has a Stripe price environment key.
- `validate:stripe-mode` checks test/live mode consistency and price ID coverage.
- `functions/api/create-checkout-session.js` posts only the product SKU from the browser and resolves the product server-side.
- Checkout fails closed when a product is unavailable, a Stripe key is missing, Stripe mode mismatches the key, or the selected mode has no price ID.
- `functions/_runtime/catalog.js` falls back to seeded products if D1 is bound but unavailable, empty, or unmigrated.

## What The Repo Does Not Prove

The repo does not prove deployed Stripe checkout works until the deployed endpoint returns a Stripe Checkout URL for every active paid SKU.

The required live smoke command is:

```bash
POSTDEPLOY_BASE_URL="https://approvalprep.com" npm run ops:stripe:test-checkout
```

Pass condition:

- All 8 active paid SKUs return HTTP 200.
- Every response includes a `checkoutUrl` containing `checkout.stripe.com`.
- `reports/ops/stripe-test-checkout-smoke.json` records `ok: true` for every SKU.
- Each paid SKU unlocks the purchased kit PDF guide and editable DOCX file after verified payment.
- The 8 paid kits are the checkout products. The catalog has 50 named tools/templates/checklists; the Complete ApprovalPrep Bundle includes the full library in one PDF and one DOCX.

Fail condition:

- Any SKU returns 4xx/5xx.
- Any response lacks a Stripe Checkout URL.
- Any response reports `MISSING_STRIPE_TEST_PRICE`, `MISSING_STRIPE_LIVE_PRICE`, `STRIPE_MODE_MISMATCH`, `STRIPE_CHECKOUT_FAILED`, or a blank/non-JSON error.

## If The Smoke Fails

Check, in this order:

1. `STRIPE_SECRET_KEY` exists in the Cloudflare Pages/Functions environment.
2. `STRIPE_MODE` matches the key prefix: `test` for `sk_test_`, `live` for `sk_live_`.
3. All `STRIPE_PRICE_*` environment values exist for the selected mode.
4. D1 migrations have run, or the seeded product fallback is present in the deployed code.
5. Cloudflare function logs for `/api/create-checkout-session`.

## Evidence Boundary

Green validators mean the checkout code, catalog model, and price-mode contract are structurally sound. They do not replace the deployed Stripe smoke test.
