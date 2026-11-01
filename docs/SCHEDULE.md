# Schedule

Every scheduled GitHub Actions job in this repo. Times are Central (America/Chicago): each
`schedule:` entry carries `timezone: America/Chicago`, which GitHub Actions honours, so the clock
change in March and November no longer moves a job. Rebalanced 1 Nov 2026 (owner-approved weekly
schedule); see the notes below for what moved.

| Job | Workflow | When | Cron |
|---|---|---|---|
| Citation OS Daily | `citation-os-daily.yml` | every day 10:37 UTC | `37 10 * * *` |
| Citation OS Weekly | `citation-os-weekly.yml` | Sat 05:40 CT | `40 5 * * 6` |
| Intelligence - Competitor Watch Refresh | `competitor-watch-refresh.yml` | Sat 06:20 CT | `20 6 * * 6` |
| Intelligence - Content Opportunity Analysis | `content-opportunity-analysis.yml` | Mon–Fri 04:27 CT | `27 4 * * 1-5` |
| Entity Backlink Watch | `entity-backlink-watch.yml` | Sat 04:00 CT | `0 4 * * 6` |
| Growth Health Refresh | `growth-health-refresh.yml` | Sat 05:20 CT | `20 5 * * 6` |
| Intelligence - Growth Maintenance Analysis | `growth-maintenance-analysis.yml` | Tue, Thu 05:43 CT | `43 5 * * 2,4` |
| Intelligence - Ingest Free Sources | `intelligence-ingest-free-sources.yml` | every day 03:17 CT | `17 3 * * *` |
| Notification Dispatch | `notification-dispatch.yml` | Fri 09:29 CT | `29 9 * * 5` |
| Intelligence - Page Refresh Queue | `page-refresh-queue.yml` | Sat 04:20 CT | `20 4 * * 6` |
| Pinterest Metrics | `pinterest-metrics.yml` | Sat 06:00 CT | `0 6 * * 6` |
| Pinterest Refill | `pinterest-refill.yml` | every day 06:05 CT | `5 6 * * *` |
| Post-deploy live check | `post-deploy-live-check.yml` | every day 09:40 CT | `40 9 * * *` |
| Scheduled Content Release | `scheduled-content-release.yml` | every day 05:07 CT | `7 5 * * *` |
| Weekly Growth Ops | `weekly-growth-ops.yml` | Sat 04:40 CT | `40 4 * * 6` |

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
