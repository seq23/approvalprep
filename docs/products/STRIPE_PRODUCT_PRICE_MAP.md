# Stripe Product and Price Map

Checkout uses Price IDs, not Product IDs. Product IDs are catalog references. Price changes should create a new Stripe price and update the active registry field. Do not delete old Stripe prices from history.

## Test and Live Mode

Checkout must use `STRIPE_MODE=test` with `sk_test_` keys and test price IDs. Checkout must use `STRIPE_MODE=live` with `sk_live_` keys and live price IDs. The app should reject mode/key mismatches instead of silently sending a live key to test prices or a test key to live prices.

Run test checkout smoke after deployment:

```bash
STRIPE_MODE=test npm run ops:stripe:test-checkout
```
