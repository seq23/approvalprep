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

---

# Safe Harbor Admin Panel Addendum

The admin area now includes Safe Harbor and citation-operation signals.

A non-engineer should read the Safe Harbor panel as follows:

- SAFE_AUTOPUBLISH: passed guardrails
- REWRITTEN_AND_AUTOPUBLISHED: risky wording was safely rewritten before publication
- BLOCKED_PROHIBITED_CLAIM: do not publish
- BLOCKED_SOURCE_REQUIRED: needs approved source coverage
- BLOCKED_MISSING_DISCLOSURE: needs required disclosure
- APPROVAL_REQUIRED_EDGE_CASE: owner/operator review needed

Do not override blocked regulated content manually. Copy the decision, path, and reason, then escalate.
