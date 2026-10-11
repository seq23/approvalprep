# Zero paid LLM — approvalprep

Owner policy, 11 Oct 2026: "nothing should be paid … cut the probes and make them free."

## What was paid

| Call site | Ran from | How often | Model | What it did |
|---|---|---|---|---|
| `scripts/llm_citation_probe.mjs` | `citation-os-weekly.yml` step "Observe whether answer engines cite us" | Every Monday, 12:17 UTC, 25 queries | `openai/gpt-4o-mini` + OpenRouter web plugin (parallel/turbo, about $0.00127 per call measured) | Citation probe: asked whether answer engines cite this site. Observes/scores the loop's own output. |

No content generation, rewriting, classification or outreach in this repo calls a model. The page factory, the atom expansion and self-heal are all deterministic. `citation-os-daily.yml` has no schedule; its cron is commented out.

## Now

- **The probe is off.** It is on no schedule. It moved to `citation-probe.yml` and runs only when someone dispatches it by hand with `confirm_paid: true`. Any other dispatch is the named stop `PAID_LANE_REFUSED`. The script also refuses on its own when `CONFIRM_PAID` is not `true` (exit 0, receipt, no network call).
- **Every model call goes through the free router**, `scripts/llm/free_router.mjs`. It reads `config/llm_routing.json`, where `max_cost_usd: 0` is a hard policy. The router tries only the listed $0 models, in order (snapshot dated in the file). It adds OpenRouter `provider.max_price` 0 and never falls back to a paid model. If no free model answers, it returns a named stop and generates nothing. A non-zero `usage.cost`, or an answer from a model that is not on the list, throws and fails the run.
- **The weekly lane checks the router.** `citation-os-weekly.yml` runs `npm run llm:check`. It confirms live pricing is still $0, then sends one free ping. Its receipt is the log line `LLM_ROUTER_RECEIPT`. A key that is disabled or invalid gives the named stop `CREDENTIAL_REFUSED`, and the lane stays green.
- **The guard is `validate:zero-paid-llm`**, registered HARD_FAIL in `_repo_validation_registry.json` and run by `validate:all` on every PR.

## Refreshing the free list

Fetch `https://openrouter.ai/api/v1/models` (no key). Keep models where `pricing.prompt == "0" && pricing.completion == "0"` and the context is at least 32k. Update `models` and `pricing_snapshot` in `config/llm_routing.json`. If a configured model turns paid, `llm:check` fails loudly.
