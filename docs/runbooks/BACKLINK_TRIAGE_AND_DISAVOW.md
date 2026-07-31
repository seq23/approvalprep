# Backlink Triage and Disavow Runbook

1. Export links from Google Search Console and Semrush into `data/seo/import_templates/semrush_backlinks.csv`.
2. Import any existing disavow file before making changes; a replacement upload supersedes it.
3. Normalize exact root domains. Wildcards such as `fiverr-*.site` are not valid evidence or final entries.
4. Review source pages, anchors, follow status, ownership, and whether the link was intentionally acquired.
5. Check Search Console → Security & Manual Actions → Manual actions.
6. Mark each exact domain `KEEP`, `REMOVE_REQUESTED`, or `DISAVOW_APPROVED` in the review ledger.
7. Generate a final text file only from `DISAVOW_APPROVED` exact domains using `domain:example.com`.
8. Preserve the adjudication ledger, prior file, final file hash, submission date, and owner.

Current status: deferred. The supplied evidence identifies suspicious patterns but does not include the exact export needed for a safe final disavow file.
