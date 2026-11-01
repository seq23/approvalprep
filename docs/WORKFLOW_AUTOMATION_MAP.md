# Workflow Automation Map

GitHub Actions are the operating backbone.

- `validate.yml`: runs validation and build checks on push and pull request.
- `scheduled-content-release.yml`: releases eligible safe content.
- `weekly-growth-ops.yml`: hand dispatch only. Retired from the schedule 1 Nov 2026: its scheduled run was a dry run whose output was thrown away.
- `growth-health-refresh.yml`: hand dispatch only. Retired from the schedule 1 Nov 2026: it wrote fixed panel scores and saved nothing.
- `spry-weekly-summary.yml`: Wednesdays 07:48 CT, hands ApprovalPrep's week (sales, Search Console, Pinterest, pages) to the Boss OS "Spry Labs weekly" email as the artifact `spry-weekly-summary`.
- `notification-dispatch.yml`: builds and sends owner exception notifications when configured.
- `workflow-data-trace.yml` or `workflows:trace`: creates fixture proof for workflow command paths.

Fixture traces are useful, but they are not live GitHub-hosted proof.

---

# Current Workflow Count and Plain-English Summary

The current repo has 16 GitHub workflows.

The core workflow idea is:

- daily content/citation workflows generate and validate safe public surfaces
- weekly workflows refresh intelligence, source evidence, lifecycle, backlink handoff, and metrics
- validation workflows protect the repo from broken routes, unsafe claims, paid-file leakage, fake telemetry, and workflow-scope drift
- notification/report workflows summarize what needs human attention

A workflow file proves configuration. It does not prove live provider success. Provider success requires real provider receipts.
