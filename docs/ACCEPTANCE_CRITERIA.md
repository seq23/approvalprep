# Acceptance Criteria

Hard failures block release. Warnings are visible but do not block unless they expose production-risk behavior.

## Site UX and Conversion

- Home, pricing, product, guide, legal, and download pages must use route-appropriate layouts, not one generic repeated page shell.
- Product cards must show clear product fit, price, contents, and CTA without cropped product art.
- Product images must fit their assigned containers with no important text, logo, or document edge cropped.
- The footer must include Products, Popular Guides, Company, Legal, and Resources link groups.
- Copy must explain what ApprovalPrep does, what the user receives, what happens next, and what ApprovalPrep does not do.

## Payment and Downloads

- Stripe checkout must include SKU metadata.
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
