# Product Admin Runbook

Admin URL: `/admin`

Password: `blackgirlmagic`

Day-0 flow: unlock admin, review products, use explicit buttons only. Add products as draft, upload image/PDF/DOCX, create Stripe product/price, then publish. Do not publish a product without image, PDF, DOCX, and active price.

Postdeploy base URL for runtime proof: `https://approvalprep.pages.dev`.

Admin buttons mutate Cloudflare runtime state through server-side Functions. GitHub Actions are for validation and backups only.
