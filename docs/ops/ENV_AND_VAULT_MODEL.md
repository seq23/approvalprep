# ApprovalPrep Env and Vault Model

ApprovalPrep has two lanes.

The updater lane is safe and repeatable. The v3.1 updater applies the ZIP, installs dependencies, runs validators, builds, and commits without real vendor secrets. This lane uses `.env.example`, `.dev.vars.example`, `.ops/vault.example.json`, and fixture-safe validators only.

The real deployment lane unlocks `.ops/vault.enc` locally with `blackgirlmagic`. The decrypted vault is kept in memory and used to push Cloudflare Pages secrets, apply D1 migrations, upload R2 assets, and run real smoke tests.

Repo-owned ApprovalPrep secrets are always `blackgirlmagic`: admin gate password, app session secret, download signing secret, and vault passphrase. Vendor-issued secrets remain the values issued by Cloudflare, Stripe, Resend, Google, Bing, or another provider.

Do not commit plaintext `.env`, `.dev.vars`, decrypted vault JSON, setup-state real files, passphrase files, or private ops archives.
