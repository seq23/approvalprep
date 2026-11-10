# Download Asset Registry

Runtime paid downloads must be stored in R2 as private objects and served only through entitlement-protected API routes.

- The paid PDF/DOCX kit files are not in this public repository. They live in `APPROVALPREP_KITS_DIR` (default `~/.boss-os/approvalprep/kits`); `scripts/generate_consumer_downloads.py` writes there and `npm run ops:r2:upload` uploads from there after the kit safety gate (`scripts/ops/lib/upload-kits.mjs`).
- Paid files must not be deployed from `public/downloads/`.
- `/api/verify-download` verifies Stripe payment and records an entitlement.
- `/api/download-file` streams PDF/DOCX files only after entitlement verification.
- Static public downloads are not a production paid-delivery path.
