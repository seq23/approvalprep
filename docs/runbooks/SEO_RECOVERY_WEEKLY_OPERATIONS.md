# SEO Recovery Weekly Operations

## Every week for the first 90 days

1. Export GSC page/query performance and indexing data into the templates under `data/seo/import_templates/`.
2. Run the canonical-host live check and record redirect failures.
3. Confirm the 42 legacy URLs remain outside the sitemap and return a permanent redirect to the exact canonical target.
4. Review the five recovery pages for impressions, selected canonical, indexing, and query cannibalization.
5. Review the Readiness Index backlink/outreach ledger. Count only links with a live source URL.
6. Review the private content opportunity queue. Improve canonical pages first; admit a new route only when intent, source depth, and differentiation are proven.
7. Rebuild the structural scorecard with `node scripts/metrics/build-seo-recovery-scorecard.mjs`.

## 30-day gate

- Alternate hosts permanently redirect to apex.
- Legacy duplicates are dropping from Google’s indexed inventory.
- All five new/flagship pages are discovered and have a declared/selected canonical match.
- No generator has recreated derivative public URLs.

## 60-day gate

- Employment verification impressions and query coverage show a positive or diagnosable trend.
- New letter pages have non-zero impressions or a documented indexing diagnosis.
- The report has completed targeted outreach with truthful ledger status.

## 90-day gate

- Decide which canonical page families earned impressions, links, or assisted conversions.
- Expand only the proven families.
- Consolidate or noindex pages that remain duplicative or unsupported.

## Truth rule

Repository counts are structural. They do not prove rankings, traffic, indexing, backlinks, citations, or conversions. External outcomes require GSC, provider, analytics, or live-source evidence.
