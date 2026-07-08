# Updater-Safe Validation

`npm run validate:all` is intentionally safe for the v3.1 updater. It must not unlock `.ops/vault.enc`, call Cloudflare, call Stripe, call Resend, or require real secrets.

Updater-safe validation checks source structure, static data, payment/download fixture logic, env examples, vault example schema, and secret hygiene.

Real service proof belongs to:

```bash
npm run ops:deploy
npm run ops:test:real
```

Those commands may prompt for `blackgirlmagic` because they use the encrypted local vault.
