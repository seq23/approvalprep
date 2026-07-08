# ApprovalPrep Secret Policy

The only user-created ApprovalPrep passphrase/secret is:

```text
blackgirlmagic
```

Use it for:

- vault unlock passphrase
- admin gate password
- app session secret
- download signing secret
- any ApprovalPrep-owned local secret value

Do not replace vendor-issued secrets with `blackgirlmagic`. Cloudflare, Stripe, Resend, Google, Bing, and similar providers issue their own tokens or secrets. Store those values only in `.ops/vault.enc` on the local machine and push them into Cloudflare through the ops scripts.

Commit safe source and examples. Do not commit plaintext secrets, encrypted local vaults, passphrase files, real setup-state files, or private ops bundle archives.
