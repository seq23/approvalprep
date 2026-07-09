# GitHub Actions And Content Autopublish Proof

This document explains what is structurally proven about ApprovalPrep workflows and what still requires hosted GitHub Actions telemetry.

## Scheduled Content Release

Workflow: `.github/workflows/scheduled-content-release.yml`

Schedule:

- Cron: `17 10 * * *`
- Central daylight time: approximately 5:17 AM

What it does:

1. Checks out the repo.
2. Installs Node dependencies.
3. Applies delegated authority in dry-run mode unless explicitly changed.
4. Attempts safe self-healing.
5. Revalidates after self-healing.
6. Builds owner exception and notification queue data.
7. Runs `npm run content:release`.
8. Commits changed `data` and `reports` files.
9. Pushes the commit.
10. Runs the automation safety boundary.

`content:release` runs:

```bash
npm run content:generate && npm run content:self-heal && npm run validate:all
```

`content:generate` currently creates 30 route-answer assets in `data/content/generated_answers.json`. Low-risk assets are marked `published_by_contract`; regulated assets are marked `approval_required`.

## What The Faux Trace Proves

The repo contains fixture traces in `data/workflow_traces/`.

Current structural trace expectations:

- All workflows are manually runnable.
- All workflows expose a `fixture_trace` input.
- The latest trace covers 14 workflows.
- Traces mark themselves as fixture proof only.
- Traces explicitly state they are not production telemetry and may not be used for growth claims.

Run:

```bash
npm run workflows:trace
npm run validate:workflow-trace
```

## What The Faux Trace Does Not Prove

Fixture traces do not prove:

- GitHub Actions actually ran on GitHub-hosted runners.
- GitHub secrets are present.
- GitHub push permissions are accepted.
- Cloudflare rebuilds after the content commit.
- External indexing providers accepted submissions.
- Content was crawled, surfaced, cited, or ranked.

## Tomorrow Autopublish Expectation

If GitHub Actions is enabled, dependencies install, and branch permissions allow bot commits, the scheduled content release should run tomorrow at the scheduled time, generate route-answer assets, validate them, and push changes. The public blog reads from `data/content/generated_answers.json`, so a pushed content change should become visible after the hosting platform rebuilds.

If it does not run, check:

1. GitHub Actions is enabled for the repo.
2. The workflow is present on the default branch.
3. The default branch allows `GITHUB_TOKEN` contents write.
4. `npm install` succeeds in Actions.
5. `validate:all` passes in Actions.
6. Cloudflare Pages is connected to the repo and rebuilds on push.

## Evidence Boundary

The repo proves workflow shape, fixture trace coverage, guardrail scripts, and content generation mechanics. It does not prove hosted execution until a GitHub Actions run is observed.
