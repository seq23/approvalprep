# Canonical Host and Redirect Runbook

## Target state

`https://approvalprep.com` is the only indexable origin. `www.approvalprep.com` and the Pages development hostname permanently redirect to the same path on the apex origin.

## Repository controls now present

1. Canonical origin remains `https://approvalprep.com` in Astro, sitemap, robots, JSON/LLM surfaces, and route metadata.
2. `public/_redirects` includes a source-controlled `www` → apex fallback.
3. `ops/cloudflare/canonical_host_redirects.json` defines the account-level rule contract.
4. `scripts/seo/check-canonical-host.mjs` performs static checks and optional live checks.

## Cloudflare account action

Create a Bulk Redirect or equivalent rule for `www.approvalprep.com/*` to `https://approvalprep.com/${path}` with status 301 and query preservation. Add a Pages/Worker redirect for the `pages.dev` hostname if it remains publicly reachable.

## Verification

Run `node scripts/seo/check-canonical-host.mjs --live` after deployment. The script must report one permanent hop, path preservation, query preservation, and an apex canonical.

## Rollback

Disable the account rule and restore the prior `_redirects` file from the baseline ZIP. Do not change sitemap/canonical origin during rollback unless the preferred hostname itself changes.
