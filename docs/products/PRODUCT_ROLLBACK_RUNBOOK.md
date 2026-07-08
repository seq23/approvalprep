# Product Rollback Runbook

Fast rollback: set product status to `hidden` or `revoked`. Do not delete the product record. Export registry JSON before and after material changes. If uploads fail, restore the previous asset ID in D1. If Stripe creation fails, leave product in draft.
