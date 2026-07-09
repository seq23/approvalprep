# Product Admin Runbook

Admin URL: `/admin`

Password: `blackgirlmagic`

Day-0 flow: unlock admin, review products, use explicit buttons only. Add products as draft, upload image/PDF/DOCX, create Stripe product/price, then publish. Do not publish a product without image, PDF, DOCX, and active price.

Do not publish a paid product unless both test and live Stripe product/price IDs are present. Test IDs are required for checkout smoke before live release; live IDs are required for production checkout.

Postdeploy base URL for runtime proof: `https://approvalprep.pages.dev`.

Admin buttons mutate Cloudflare runtime state through server-side Functions. GitHub Actions are for validation and backups only.
