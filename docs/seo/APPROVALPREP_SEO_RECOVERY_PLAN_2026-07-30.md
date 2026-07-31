# ApprovalPrep SEO Recovery Plan — Corrected Implementation Scope

## Governing decision

The original public publishing system remains intact: the scheduled generator, generated-answer registry, public blog detail route, release ledger, feeds, LLM indexes, metrics, workflows, and validation contracts continue to operate.

The only publishing correction is canonical consolidation of 42 specifically identified templated duplicate URLs. Their source records remain in `generated_answers.json` as redirect-backed tombstones, which preserves release history and prevents the original generator from recreating those exact outputs.

## Phases 0–7

1. Capture baseline and rollback evidence.
2. Add canonical-host controls and evidence-gated backlink/disavow operations.
3. Add 42 permanent redirects and suppress only those exact duplicate records from public discovery.
4. Rebuild `/employment-verification-letter` as the flagship page.
5. Add the 609, goodwill, late-payment explanation, and large-deposit explanation pages.
6. Publish the 100-source Document Readiness Index, CSV, methodology, press brief, and outreach operations.
7. Add internal-link improvements and the 30/60/90 measurement system.

## Explicitly preserved

- `scripts/content/generate-candidate.mjs`
- `src/pages/blog/[slug].astro`
- `data/content/generated_answers.json`
- scheduled content release workflow
- public feed and machine-readable indexes
- content velocity metrics
- original publishing validation and self-healing model

## External actions still required

Cloudflare account configuration, Search Console and Semrush exports, final disavow adjudication/submission, outreach sending, deployment, and post-deployment measurement require live credentials or elapsed data and are not simulated.
