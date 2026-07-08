# ApprovalPrep One-Time Setup

Run `npm run setup:doctor` first. Then run `npm run setup:secrets` locally to create an encrypted `.env.vault`. Real secrets are never committed.

Use `npm run secrets:push -- --target cloudflare` to push runtime secrets with Wrangler, or `npm run secrets:push -- --target github` for GitHub Actions secrets. Missing CLIs return honest NOT_CONFIGURED or CLI_MISSING states.

After setup, run `npm run secrets:audit` and the local updater validation.


## Postdeploy validation base URL

Use `https://approvalprep.pages.dev` for postdeploy smoke checks. Set `POSTDEPLOY_BASE_URL=https://approvalprep.pages.dev` and `PLAYWRIGHT_BASE_URL=https://approvalprep.pages.dev` when running postdeploy/browser validation.
