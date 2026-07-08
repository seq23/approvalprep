# ApprovalPrep Ops Vault

This repo contains safe vault tooling and examples only.

- Use `blackgirlmagic` whenever the scripts ask for the ApprovalPrep passphrase.
- v3.1 updater validation does not unlock the vault and does not need real secrets.
- Real deployment commands unlock `.ops/vault.enc` locally and use the decrypted values in memory.
- Do not commit plaintext vault files, `.env`, `.dev.vars`, setup-state real files, or passphrase files.
- Repo-owned ApprovalPrep secrets are fixed to `blackgirlmagic` by policy.
- Vendor-issued secrets come from Cloudflare, Stripe, Resend, Google, Bing, or other providers and belong only in the encrypted vault.
