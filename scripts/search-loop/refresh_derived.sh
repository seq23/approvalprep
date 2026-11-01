#!/usr/bin/env bash
# Search loop: everything the site derives from its published URL set, rebuilt after
# the engine changed that set (new pages, or a merge that dropped one). Without this,
# main goes red on the next validate run: index coverage and consolidation candidates
# must match the sitemap, and every outbound link a page cites must have a measured status.
set -Eeuo pipefail
npm run seo:sitemap
npm run routes:redirects
npm run build
npm run linkcheck:outbound
npm run search-intelligence:index-coverage:reconcile
npm run search-intelligence:consolidation
sha1sum public/sitemap.xml 2>/dev/null | cut -d' ' -f1 > .search-loop-derived || shasum public/sitemap.xml | cut -d' ' -f1 > .search-loop-derived
