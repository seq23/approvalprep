# ApprovalPrep Hostile E2E Review — v4.2.5.8

Status: PATCHED AND REVALIDATED IN CONTAINER
Date: 2026-07-08
Postdeploy base URL: https://approvalprep.pages.dev
Production canonical URL: https://approvalprep.com

## What failed hostile review

1. Product grid rendered empty on homepage/pricing because `productCards` filtered on a missing `v1` property.
2. Product images were referenced in product data but absent from `public/assets/products/`.
3. Product CTAs pointed to `/download?sku=...` instead of starting Stripe checkout.
4. `robots.txt` pointed to `sitemap-index.xml`, but the repo ships `sitemap.xml`.
5. Filled secret-bearing env artifacts were committed inside the ZIP and failed the security validator.
6. Postdeploy base URL was not documented.

## What was fixed

1. Product cards now render the 8 active paid products.
2. 8 product images were added under `public/assets/products/`; each is under 2MB.
3. Product cards now start `/api/create-checkout-session` and redirect to Stripe checkout.
4. `robots.txt` now points to `https://approvalprep.com/sitemap.xml`.
5. Secret-bearing env files were removed from the repo ZIP; repo-safe templates remain.
6. `docs/runbooks/POSTDEPLOY_BASE_URL.md`, README, setup docs, and env examples now document `https://approvalprep.pages.dev`.

## SEO / AEO / GEO surfaces verified

- `public/robots.txt`
- `public/sitemap.xml`
- `/llms.txt`
- `/llms-full.txt`
- `/answers/index.json`
- canonical tags
- meta descriptions
- FAQPage JSON-LD
- HowTo JSON-LD
- Organization JSON-LD
- legal/disclaimer/credit boundary pages

## UI / UX conversion review

The UI now has visible product cards, product-specific images, clear prices, direct checkout buttons, trust signals, self-service boundaries, no-account language, mobile one-column behavior, focus states, hover states, and repeated CTAs.

Remaining visual proof boundary: this was a browserless/container review. Real deployed browser screenshots and live Stripe checkout are still postdeploy validation tasks.

## Validation run

- `npm ci` passed.
- `npm run validate:all` passed.
- `npm run build` passed.
- 45 pages built.
- 8 product images are present and under 2MB.
- Security validator passed after removing committed secret artifacts.

## Still not proven here

- Cloudflare production deployment.
- Live deployed checkout redirect against real Cloudflare Functions runtime.
- Live Stripe payment completion.
- Live verified download after paid session.
- Real browser visual proof on `https://approvalprep.pages.dev`.
