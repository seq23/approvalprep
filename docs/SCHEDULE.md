# Schedule

Every scheduled GitHub Actions job in this repo. Times are Central (America/Chicago): each
`schedule:` entry carries `timezone: America/Chicago`, which GitHub Actions honours, so the clock
change in March and November no longer moves a job. Rebalanced 1 Nov 2026 (owner-approved weekly
schedule); see the notes below for what moved.

| Job | Workflow | When | Cron |
|---|---|---|---|
| Email nurture tick (free sample series) | `email-nurture.yml` | every day 08:17, 13:17, 18:17 CT | `17 8,13,18 * * *` |
| Citation OS Weekly | `citation-os-weekly.yml` | Sat 05:40 CT | `40 5 * * 6` |
| Intelligence - Competitor Watch Refresh | `competitor-watch-refresh.yml` | Sat 06:20 CT | `20 6 * * 6` |
| Intelligence - Content Opportunity Analysis | `content-opportunity-analysis.yml` | Mon–Fri 04:27 CT | `27 4 * * 1-5` |
| Entity Backlink Watch | `entity-backlink-watch.yml` | Sat 04:00 CT | `0 4 * * 6` |
| Intelligence - Growth Maintenance Analysis | `growth-maintenance-analysis.yml` | Tue, Thu 05:43 CT | `43 5 * * 2,4` |
| Intelligence - Ingest Free Sources | `intelligence-ingest-free-sources.yml` | every day 03:17 CT | `17 3 * * *` |
| Notification Dispatch | `notification-dispatch.yml` | Fri 09:29 CT | `29 9 * * 5` |
| Intelligence - Page Refresh Queue | `page-refresh-queue.yml` | Sat 04:20 CT | `20 4 * * 6` |
| Pinterest Metrics | `pinterest-metrics.yml` | Sat 06:00 CT | `0 6 * * 6` |
| Pinterest Refill | `pinterest-refill.yml` | every day 06:05 CT | `5 6 * * *` |
| Post-deploy live check | `post-deploy-live-check.yml` | every day 09:40 CT | `40 9 * * *` |
| Search Loop | `search-loop.yml` | every day 05:07 CT | `7 5 * * *` |
| Spry Labs weekly summary | `spry-weekly-summary.yml` | Wed 07:48 CT | `48 7 * * 3` |

## Not on a schedule (hand dispatch only)

- **Citation OS Daily** (`citation-os-daily.yml`): paused 8 Oct 2026; its cron line is commented out.
- **Weekly Growth Ops** (`weekly-growth-ops.yml`) and **Growth Health Refresh** (`growth-health-refresh.yml`):
  retired from the schedule 1 Nov 2026 because they produced no real output (a dry run whose output was
  thrown away; fixed panel scores saved nowhere). `validate:schedule-truth` keeps them unscheduled and
  keeps this table equal to the workflows.

## Search loop (1 Nov 2026)

- **Search Loop** (`search-loop.yml`) calls the shared engine `seq23/search-loop@v1` daily in the old
  release slot: FIND weekly, BUILD daily (gated `/questions/` pages, published straight away, pace 10/day
  rising to 30), CHECK + REPAIR (strengthen, undo, merge) and the `search-loop-week` report artifact.
- **Scheduled Content Release** (`scheduled-content-release.yml`) is retired and deleted: it was the
  frozen release lane, and the search loop replaces it. Its dry-run delegated-authority / self-heal /
  notification-queue steps are also gone from Page Refresh Queue and Growth Maintenance Analysis; they
  committed and repaired nothing. The engine's repair is the real one.
- Content Opportunity Analysis now feeds `citation_opportunity_registry.json` into the engine's topic
  seeds (`npm run search-loop:sync-topics`). Ingest Free Sources keeps measuring; Page Refresh Queue keeps
  the refresh queue the Spry Labs weekly summary reads.

## Weekly windows

- **Saturday 04:00–08:00 CT is the weekly-upkeep window for every Spry Labs side business**
  (owner ruling, 1 Nov 2026): weekly maintenance, refresh and metrics jobs run there, staggered
  at least 15 minutes apart, never two in the same slot. Publishing, link checks and
  self-healing are not upkeep and keep their own days.

## Moved on 1 Nov 2026
- The Monday batch moved to the Saturday upkeep window: Entity Backlink Watch 04:00, Page Refresh Queue
  04:20, Weekly Growth Ops 04:40, Growth Health Refresh 05:20, Citation OS Weekly 05:40, Pinterest
  Metrics 06:00. Competitor Watch Refresh moved Wednesday → Saturday 06:20.
- Every other job keeps the Central time it ran at all summer.
- Later the same day: Weekly Growth Ops and Growth Health Refresh lost their schedules (retired, above), and
  the Spry Labs weekly summary joined Wednesday 07:48 CT, after the other five side businesses (07:03–07:43),
  so ApprovalPrep has its own section in the 08:15 "Spry Labs weekly" email.
