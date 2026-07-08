# Workflow Automation Map

GitHub Actions are the operating backbone.

- `validate.yml`: runs validation and build checks on push and pull request.
- `scheduled-content-release.yml`: releases eligible safe content.
- `weekly-growth-ops.yml`: updates growth, citations, and content opportunities.
- `growth-health-refresh.yml`: refreshes growth health and UX reports.
- `notification-dispatch.yml`: builds and sends owner exception notifications when configured.
- `workflow-data-trace.yml` or `workflows:trace`: creates fixture proof for workflow command paths.

Fixture traces are useful, but they are not live GitHub-hosted proof.
