# Stripe Product and Price Map

Checkout uses Price IDs, not Product IDs. Product IDs are catalog references. Price changes should create a new Stripe price and update the active registry field. Do not delete old Stripe prices from history.
