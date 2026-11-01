#!/usr/bin/env bash
# Search loop commit (default branch only): stage only what the loop owns - its pages,
# its ledger, the redirects a merge wrote, the sitemap and the ledgers derived from it -
# then push with the repo's rebase-and-retry helper.
set -Eeuo pipefail
# A CHECK-stage merge can change the URL set on a day nothing published (post_build
# did not run): rebuild what derives from it before committing.
npm run seo:sitemap
now=$(sha1sum public/sitemap.xml 2>/dev/null | cut -d' ' -f1 || shasum public/sitemap.xml | cut -d' ' -f1)
if [ ! -f .search-loop-derived ] || [ "$(cat .search-loop-derived)" != "$now" ]; then
  bash scripts/search-loop/refresh_derived.sh
fi
git config user.name "approvalprep-search-loop"
git config user.email "actions@users.noreply.github.com"
# Stage only paths that exist: questions/ is absent until the first page publishes.
git add -- $(for p in questions data/search-loop data/routes/redirects.json public/_redirects public/sitemap.xml data/cadence data/citations/outbound_link_health.json data/search_intelligence/index_coverage.json data/search_intelligence/consolidation_candidates.json; do [ -e "$p" ] && echo "$p"; done)
if git diff --cached --quiet; then echo "search-loop: nothing to commit"; exit 0; fi
git commit -q -m "${COMMIT_MESSAGE:-search loop: daily pages, checks and ledger}"
bash scripts/workflows/safe-push-main.sh
