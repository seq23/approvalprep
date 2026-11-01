#!/usr/bin/env bash
# Search loop commit (default branch only): stage only what the loop owns - its
# pages, its ledger, the redirects a merge wrote, the sitemap and the cadence
# ledger - then push with the repo's rebase-and-retry helper.
set -Eeuo pipefail
# A CHECK-stage merge can add a redirect on a day nothing published.
npm run routes:redirects
npm run seo:sitemap
git config user.name "approvalprep-search-loop"
git config user.email "actions@users.noreply.github.com"
git add questions data/search-loop data/routes/redirects.json public/_redirects public/sitemap.xml data/cadence
if git diff --cached --quiet; then echo "search-loop: nothing to commit"; exit 0; fi
git commit -q -m "${COMMIT_MESSAGE:-search loop: daily pages, checks and ledger}"
bash scripts/workflows/safe-push-main.sh
