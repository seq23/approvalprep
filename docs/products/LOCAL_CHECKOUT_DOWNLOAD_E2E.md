# Local Checkout Download E2E

This is the operator test for the thing that matters: can a buyer reach Stripe, complete checkout with or without `TEST100`, land on the success page, and receive protected PDF/DOCX download links.

## What The Script Proves

`npm run ops:local:checkout-download-e2e` has two proof levels:

1. Checkout creation plus success-page UI proof.
   - Calls `/api/create-checkout-session` for each paid SKU.
   - Runs both full-price checkout and `TEST100` discount checkout unless `LOCAL_E2E_SKIP_DISCOUNT=1`.
   - Confirms Stripe returns a `checkout.stripe.com` Checkout URL.
   - Confirms `/checkout/success` includes the direct download choice and the optional browser-only Studio prefill choice.

2. Completed-session protected download proof.
   - Requires `LOCAL_E2E_COMPLETED_SESSION_ID` and `LOCAL_E2E_COMPLETED_SKU`.
   - Calls `/api/verify-download`.
   - Requires `status: "VERIFIED"`.
   - Fetches both protected `/api/download-file` links.
   - Requires attachment responses for PDF and DOCX.

The script writes `reports/ops/local-checkout-download-e2e.json`.

## Local Or Deployed Base URL

Use the same command against a local Wrangler Pages server or the deployed site.

```bash
LOCAL_E2E_BASE_URL="http://localhost:8788" npm run ops:local:checkout-download-e2e
```

```bash
LOCAL_E2E_BASE_URL="https://approvalprep.com" npm run ops:local:checkout-download-e2e
```

## Test One Product

```bash
LOCAL_E2E_BASE_URL="http://localhost:8788" \
LOCAL_E2E_PRODUCTS="letter-of-explanation" \
npm run ops:local:checkout-download-e2e
```

## Test The 100% Off Code

Create `TEST100` once in Stripe test mode as an active 100% off promotion code. Then run:

```bash
LOCAL_E2E_BASE_URL="http://localhost:8788" \
LOCAL_E2E_DISCOUNT_CODE="TEST100" \
npm run ops:local:checkout-download-e2e
```

If `TEST100` is missing or inactive in Stripe test mode, the script fails the discount checkout path.

## Prove A Completed Download

After completing a Stripe Checkout Session in test mode, copy the `cs_test_...` session ID and run:

```bash
LOCAL_E2E_BASE_URL="http://localhost:8788" \
LOCAL_E2E_COMPLETED_SESSION_ID="cs_test_replace_me" \
LOCAL_E2E_COMPLETED_SKU="letter-of-explanation" \
npm run ops:local:checkout-download-e2e
```

Pass condition: the report status is `PASS_COMPLETED_CHECKOUT_AND_PROTECTED_DOWNLOAD_PROOF`, `/api/verify-download` returns `VERIFIED`, and both protected files return attachment responses.

## Boundary

Without `LOCAL_E2E_COMPLETED_SESSION_ID`, the script intentionally reports `PASS_CHECKOUT_CREATION_AND_SUCCESS_UI_ONLY`. That is not download proof. It means the site can create the full-price and discount Checkout Sessions and the success page has the right post-purchase choices.
