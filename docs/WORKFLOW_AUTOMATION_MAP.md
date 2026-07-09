# Workflow Automation Map

GitHub Actions are the operating backbone.

- `validate.yml`: runs validation and build checks on push and pull request.
- `scheduled-content-release.yml`: releases eligible safe content.
- `weekly-growth-ops.yml`: updates growth, citations, and content opportunities.
- `growth-health-refresh.yml`: refreshes growth health and UX reports.
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
