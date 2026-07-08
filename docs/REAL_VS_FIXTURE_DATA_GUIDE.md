# Real vs Fixture Data Guide

Fixture data is fake data used to prove that scripts and workflows can run without live credentials.

Real data comes from live providers after credentials are configured.

Never count fixture data as search traffic, citation wins, payment proof, delivered emails, or live provider success.

Every fixture trace must say `proof_type: fixture`, `real_telemetry: false`, and `may_be_used_for_growth_claims: false`.
