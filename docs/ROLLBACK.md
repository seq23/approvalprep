# Rollback

ApprovalPrep V4 rollback is ZIP-first.

1. Keep the last known good `approvalprep_BASELINE_*.zip`.
2. Reopen the ZIP and confirm the root folder is `approvalprep/`.
3. Run the local updater in replace mode against the target repo.
4. Run `npm run validate:all`.
5. Run `npm run build`.
6. Re-deploy through Cloudflare Pages after validation passes.

Never roll back by deleting unknown user changes manually. Use a clean baseline artifact.
