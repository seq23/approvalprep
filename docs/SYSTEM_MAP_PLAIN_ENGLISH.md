# System Map in Plain English

ApprovalPrep is an Astro static site hosted on Cloudflare Pages. Public pages are generated from route and content data. Pages Functions handle Stripe checkout, payment verification, and Resend email delivery when secrets are configured.

GitHub JSON and Markdown files are the source of truth for content, products, routes, strategy, validation, workflow traces, and admin indexes. GitHub Actions run validation and scheduled operations.

The `/admin` page reads repo data. It does not store customer documents. It uses GitHub edit links for operator changes.

ApprovalPrep does not store customer letter answers, completed worksheets, filled-in templates, or uploaded personal application documents. Stripe, download verification, product admin, and asset delivery use limited operational records only: session IDs, product IDs, payment status, timestamps, product asset metadata, and admin audit history.

Fixture data proves workflow shape. Live telemetry comes only from connected providers such as Stripe, Resend, Google Search Console, Bing, IndexNow, Cloudflare, and GitHub Actions.

---

# Safe Harbor Citation OS System Map Addendum

The current system has these plain-English layers:

1. Public pages, blogs, reports, tools, and template-preview pages.
2. Citation atoms and answer surfaces for search and LLM readability.
3. Safe Harbor rules for regulated-adjacent content.
4. Source evidence ledgers for claims that require support.
5. Approval queue for unsafe, unsupported, or edge-case content.
6. Protected paid downloads for customer PDF and DOCX files.
7. Metrics, citation, crawler, indexing, conversion, and workflow reports.
8. Validators that hard-fail only on real release, safety, privacy, paid-file, or compliance blockers.

The system should never claim fake live provider results, fake citations, fake legal review, or fake payment proof.
