# System Map in Plain English

ApprovalPrep is an Astro static site hosted on Cloudflare Pages. Public pages are generated from route and content data. Pages Functions handle Stripe checkout, payment verification, and Resend email delivery when secrets are configured.

GitHub JSON and Markdown files are the source of truth for content, products, routes, strategy, validation, workflow traces, and admin indexes. GitHub Actions run validation and scheduled operations.

The `/admin` page reads repo data. It does not store customer documents. It uses GitHub edit links for operator changes.

ApprovalPrep does not store customer letter answers, completed worksheets, filled-in templates, or uploaded personal application documents. Stripe, download verification, product admin, and asset delivery use limited operational records only: session IDs, product IDs, payment status, timestamps, product asset metadata, and admin audit history.

Fixture data proves workflow shape. Live telemetry comes only from connected providers such as Stripe, Resend, Google Search Console, Bing, IndexNow, Cloudflare, and GitHub Actions.
