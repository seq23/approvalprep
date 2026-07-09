# Real vs Fixture Data Guide

Fixture data is fake data used to prove that scripts and workflows can run without live credentials.

Real data comes from live providers after credentials are configured.

Never count fixture data as search traffic, citation wins, payment proof, delivered emails, or live provider success.

Every fixture trace must say `proof_type: fixture`, `real_telemetry: false`, and `may_be_used_for_growth_claims: false`.

---

# Safe Harbor / Citation OS Proof Boundary Addendum

Safe Harbor audit records prove that repo rules evaluated content. They do not prove attorney review.

Source candidate queues prove possible sources were identified or staged. They do not prove the source is approved.

Confirmed citations require evidence. Citation candidates are not citation wins.

Provider ledgers marked NOT_CONFIGURED, NO_DATA, FIXTURE, DRY_RUN, or UNAVAILABLE must not be described as live success.

Paid download fixture tests prove local logic. They do not prove a real completed Stripe checkout unless the proof record says a real checkout was completed.
