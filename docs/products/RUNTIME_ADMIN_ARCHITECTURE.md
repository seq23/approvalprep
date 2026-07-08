# Runtime Product Admin Architecture v4.3.0

D1 is source of truth. KV is public catalog cache. R2 stores product images and paid download files. Cloudflare Pages Functions handle admin mutation, checkout, webhooks, and download verification.

Bindings required: `PRODUCTS_DB`, `PRODUCTS_KV`, `PRODUCT_ASSETS_R2`.

Secrets required: `ADMIN_GATE_PASSWORD`, `ADMIN_SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
