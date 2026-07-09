# Acceptance Criteria

Hard failures block release. Warnings are visible but do not block unless they expose production-risk behavior.

## Site UX and Conversion

- Home, pricing, product, guide, legal, and download pages must use route-appropriate layouts, not one generic repeated page shell.
- Product cards must show clear product fit, price, contents, and CTA without cropped product art.
- Product images must fit their assigned containers with no important text, logo, or document edge cropped.
- The footer must include Products, Popular Guides, Company, Legal, and Resources link groups.
- Copy must explain what ApprovalPrep does, what the user receives, what happens next, and what ApprovalPrep does not do.
- The homepage must lead with the strongest compliant buying promise: self-service credit repair letters and approval-ready direct-download document kits without high monthly fees.
- The homepage must explain the optional free `$0` Letter Writing Studio path without making it look required before purchase.
- The top NAV must guide buyers through Products, Letter Studio, Pricing, Resources, and a pricing CTA.
- Use cases must appear in a visible secondary nav rail with the important subpages laid out directly.
- Commercial pages must include repeated CTAs, included offerings, purchase-next-step explanation, trust boundaries, and no-storage reassurance.
- The 30+ self-service offering universe must be visible on public pages and tied back to the 8 paid products.
- The Letter Writing Studio must be `$0`, browser-only, no API, no AI/vendor call, no upload, no account, and no stored answers.

## Payment and Downloads

- Stripe checkout must include SKU metadata.
- Stripe checkout must choose test price IDs with test keys and live price IDs with live keys.
- Stripe test checkout must be smoke-tested against the deployed URL before treating checkout as live-proven.
- Stripe webhooks must verify `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
- Paid PDF/DOCX files must not be served directly from `public/downloads`.
- Verified downloads must use entitlement-protected API links backed by D1/R2.
- Real Stripe, D1, R2, and KV behavior remains unproven until local/deployed smoke tests run.

## Content, Atoms, and LLM Surfaces

- `llms.txt`, `llms-full.txt`, and `/answers/index.json` must expose useful structured identity, route, product, atom, claim, and source data.
- Atom files must include usable definitions, short answers, checklists, boundaries, comparisons, process atoms, and product atoms.
- 100K surfacing/citation claims must separate planned targets from generated surfaces, detected opportunities, and observed wins.
- Observed wins require telemetry or manual proof. They cannot be inferred from targets.

## Automation Honesty

- Fixture traces must not be described as real production workflow proof.
- Admin queue links must not use `OWNER/approvalprep` placeholders.
- Scheduled content release must generate real answer assets, not only release-ledger placeholders.
