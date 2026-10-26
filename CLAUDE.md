# approvalprep — working rules

The repository's full authority chain is in `AGENTS.md` and `REPO_IDENTITY.md`. This file holds
the rules an agent must not get wrong, with the code that enforces each one named beside it.

## Nothing paid

**Nothing paid.** No model call, search call or provider call in this repository may cost money.
Every model call goes through the free router, `scripts/llm/free_router.mjs`, which reads
`config/llm_routing.json` where `max_cost_usd` is `0` and every model id ends in `:free`. If no
free model answers, the router returns a named stop and generates nothing — it never falls back
to a paid model.

The one paid lane that exists, the citation probe, is on no schedule. It runs only on a hand
dispatch carrying `confirm_paid: true`; any other dispatch is the named stop `PAID_LANE_REFUSED`.

- The full policy, what used to be paid and how to refresh the free model list:
  [`docs/cost/zero-paid-llm.md`](docs/cost/zero-paid-llm.md).
- The guard: `npm run validate:zero-paid-llm`
  (`scripts/llm/validate_zero_paid_llm.mjs`), registered HARD_FAIL in
  `_repo_validation_registry.json` and run by `validate:all` on every pull request. It reads this
  file: delete the "nothing paid" line above and the validator fails, so the rule cannot drift
  out of the place an agent reads first.

Owner policy, 11 October 2026: *"nothing should be paid … cut the probes and make them free."*

## Before you change anything

- Run the repository's own validators in one batch: `npm run validate:all`. Build first —
  every validator that reads `dist/` is ordered after the build in
  `_repo_validation_registry.json`.
- Never edit built output (`dist/`). Fix the generator, the template, or the data file.
- A new rule needs a validator that reads it, registered in `_repo_validation_registry.json`
  and mirrored with `npm run validation:registry:sync`. A rule no code reads is a wish.
