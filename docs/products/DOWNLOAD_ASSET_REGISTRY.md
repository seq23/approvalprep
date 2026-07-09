# Download Asset Registry

Runtime paid downloads must be stored in R2 as private objects and served only through entitlement-protected API routes.

- Seed PDF/DOCX files live in `seed-downloads/` for R2 upload.
- Paid files must not be deployed from `public/downloads/`.
- `/api/verify-download` verifies Stripe payment and records an entitlement.
- `/api/download-file` streams PDF/DOCX files only after entitlement verification.
- Static public downloads are not a production paid-delivery path.
