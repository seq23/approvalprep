# Local Checkout Download E2E

This is the operator test for checkout creation, success-page clarity, completed-session verification, and protected PDF/DOCX delivery.

## Proof Levels

`npm run ops:local:checkout-download-e2e` has three proof levels:

1. Checkout creation plus success-page UI proof.
   - Calls `/api/create-checkout-session` for each paid SKU.
   - Runs both full-price checkout and `TEST100` discount checkout unless `LOCAL_E2E_SKIP_DISCOUNT=1`.
   - Confirms Stripe returns a `checkout.stripe.com` Checkout URL.
   - Confirms `/checkout/success` visibly says `Success! Your checkout is complete.` and includes the direct download choice plus the optional browser-only Studio prefill choice.

2. Completed-session protected download proof.
   - Requires a real completed Checkout Session ID through `LOCAL_E2E_COMPLETED_SESSION_ID`, `APPROVALPREP_COMPLETED_SESSION_ID`, or `STRIPE_CHECKOUT_SESSION_ID`.
   - Requires `LOCAL_E2E_COMPLETED_SKU` or `APPROVALPREP_COMPLETED_SKU`.
   - Calls `/api/verify-download`.
   - Requires `status: "VERIFIED"`.
   - Fetches both protected `/api/download-file` links.
   - Requires attachment responses for PDF and DOCX.

3. Fixture fulfillment fallback proof.
   - Run with `LOCAL_E2E_FIXTURE=1` or `LOCAL_E2E_FIXTURE_ONLY=1`.
   - Mocks a completed Stripe `no_payment_required` Checkout Session.
   - Forces D1 entitlement lookup/write to fail.
   - Proves `verify-download` still returns verified download links.
   - Proves `download-file` can verify Stripe directly and return PDF/DOCX attachments from R2.

The script writes `reports/ops/local-checkout-download-e2e.json` with the exact HTTP statuses, API statuses, snippets, and file checks.

## Deployed Checkout Creation + UI

```bash
LOCAL_E2E_BASE_URL="https://approvalprep.com" npm run ops:local:checkout-download-e2e
```

Pass condition: `PASS_CHECKOUT_CREATION_AND_SUCCESS_UI_ONLY`. That is not download proof. It means the site can create the full-price and discount Checkout Sessions and the success page has the right post-purchase choices.

## Fixture Fulfillment Test Without Manual Checkout

```bash
LOCAL_E2E_FIXTURE_ONLY=1 npm run ops:local:checkout-download-e2e
```

Pass condition: `PASS_CHECKOUT_CREATION_SUCCESS_UI_AND_FIXTURE_FULFILLMENT` or a fixture report with `ok: true`. This does not contact live Stripe. It proves the code handles a completed no-cost Checkout Session, D1 failure, and protected PDF/DOCX delivery fallback.

## Completed Session Proof

After completing a Stripe Checkout Session, copy the `cs_test_...` or `cs_live_...` Checkout Session ID and run:

```bash
LOCAL_E2E_BASE_URL="https://approvalprep.com" \
LOCAL_E2E_COMPLETED_SESSION_ID="cs_live_or_cs_test_paste_real_session_id" \
LOCAL_E2E_COMPLETED_SKU="letter-of-explanation" \
npm run ops:local:checkout-download-e2e
```

Pass condition: the report status is `PASS_COMPLETED_CHECKOUT_AND_PROTECTED_DOWNLOAD_PROOF`, `/api/verify-download` returns `VERIFIED`, and both protected files return attachment responses.

## Test One Product

```bash
LOCAL_E2E_BASE_URL="https://approvalprep.com" \
LOCAL_E2E_PRODUCTS="letter-of-explanation" \
npm run ops:local:checkout-download-e2e
```

## Test The 100% Off Code

Create `TEST100` once in the same Stripe mode as the deployed site as an active 100% off promotion code. Then run:

```bash
LOCAL_E2E_BASE_URL="https://approvalprep.com" \
LOCAL_E2E_DISCOUNT_CODE="TEST100" \
npm run ops:local:checkout-download-e2e
```

If `TEST100` is missing or inactive in the deployed Stripe mode, the script fails the discount checkout path.

## Boundary

Stripe Checkout completion still happens in hosted Checkout. The non-manual fixture test proves ApprovalPrep fulfillment logic without a browser purchase. The completed-session test proves the deployed provider path using an existing Stripe Checkout Session ID.
