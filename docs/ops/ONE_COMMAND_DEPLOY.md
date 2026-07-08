# ApprovalPrep One-Command Deploy

Initial local setup after the repo ZIP applies cleanly:

```bash
npm run ops:vault:init
npm run ops:vault:check
```

Real deployment after GitHub is connected to Cloudflare Pages:

```bash
npm run ops:deploy
```

When prompted, enter:

```text
blackgirlmagic
```

The deploy command unlocks the encrypted vault, validates required real vendor values, creates/checks Cloudflare resources through Wrangler commands, pushes Pages secrets, applies D1 migrations, seeds the product registry, uploads downloadable assets to R2, and runs smoke checks against `POSTDEPLOY_BASE_URL`.

If Cloudflare creates new D1/KV resource IDs, copy those IDs from Wrangler output into `wrangler.toml` before the final Pages deployment uses them.
