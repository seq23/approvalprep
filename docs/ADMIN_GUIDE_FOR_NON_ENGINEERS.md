# Admin Guide for Non-Engineers

The admin dashboard is an exception cockpit. Most routine actions are handled by contract.

## Main statuses

- Approved by Contract: the system decided this was safe and moved forward.
- Self-Healed: the system found a problem, fixed it safely, and checked it again.
- Final Block: the system could not safely fix the problem.
- Needs Owner: this is a real owner-level decision.
- Fixture Only: this uses faux data and does not prove live results.
- Not Configured: an API key or provider setup is missing.

## What to act on

Act on Needs Owner, hard failures, payment/download failures, exposed secrets, and provider setup problems.

## What to ignore

Ignore normal success, fixture trace success, dry-run success, routine sitemap updates, and routine health snapshots.
