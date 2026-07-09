# ApprovalPrep Second-Pass Implementation Checklist

Status: structurally validated. Live provider proof still requires deployed credentials and hosted runs.

## Done

- Sitewide route copy expanded with route-specific decision context, preparation notes, mistake prevention, review checklist, FAQ, CTAs, and boundary language.
- Thin-page guardrail added: `validate:public-page-depth` now fails generic leads and indexed pages under the measured depth threshold.
- Answer atom corpus expanded to 176 atoms with source and usage maps.
- Atlas expanded to 210 admitted queries, 210 matrix rows, 42 fan-out parents, and minimum five queries per indexed route.
- SEO/AEO/GEO surfaces present: sitemap, robots.txt, redirects, llms.txt, llms-full.txt, answer JSON, atom corpus, query universe, fanout map, schema blocks, canonical URLs, and dry-run provider receipts.
- `/admin` now includes a visible SEO/AEO/GEO growth cockpit with query, atom, answer, citation opportunity, workflow trace, indexing, self-heal, and blocker counts.
- Workflow fixture trace regenerated across 14 GitHub Actions workflows.
- Self-heal dry-run/revalidation path executed; no repair attempts were needed because no repairable blocked queue items were present.
- Validation registry and matrix rebuilt with 50 validators and explicit hard-fail policy.
- Browserless end-to-end user journey validator added for homepage, product/pricing path, footer links, protected checkout/download routes, and boundary language.
- Data privacy pass added: sitewide notices now explain that ApprovalPrep does not store letter answers, completed worksheets, filled-in templates, or uploaded personal documents.
- Local entitlement storage no longer writes Stripe customer email into D1; entitlement verification returns a safe subset instead of raw records.
- `validate:data-privacy` added as a hard-fail release check.
- Protected download, Stripe webhook, entitlement, public-download removal, image upload cap removal, professional footer, image containment, and product media improvements from the prior pass remain in place.

## Not Proven In Sandbox

- Astro production build, because package installation is blocked by registry/proxy 403 responses for npm package tarballs.
- Cloudflare Pages deployment.
- Hosted GitHub Actions run.
- Live IndexNow, Bing Webmaster, and Google Search Console submission.
- Stripe test checkout and webhook delivery.
- R2 private paid-download streaming.
- Resend email delivery.
- Observed LLM citations, surfacings, rankings, or traffic.

## Validation Passed

- `npm run validate:all`
- `validate:atlas`
- `validate:seo-surfaces`
- `validate:admin`
- `validate:public-page-depth`
- `validate:e2e-user-journey`
- `validate:workflow-trace`
- `validate:payment-download`
- `validate:download-safety`
- `validate:validation-registry`
- `validate:data-privacy`

## Build Blocker

`npm install` and direct `curl` requests to npm registry tarballs returned HTTP 403 in this sandbox. Node and npm are installed; the package registry access is blocked.
