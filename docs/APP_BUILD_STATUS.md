# App build queue — 10 Nov 2026

Task 1 is merged. Task 2 is implemented in open PR #111 and included as a dependency here.
Task 1a publishes a noindex hosted preview URL in the CI summary and PR.
Task 3 is implemented: SQLite stores letters and all answer/tracking fields on the phone;
CRUD and restart persistence are tested with a real SQLite database.
Next task: 4 (letters and questions), alone. Then task 4b (free Letter Studio), alone.

NAMED STOP [WAITS_FOR_LAUNCH_PLAN]: task 11 (store files) waits for the owner's
launch plan after 13 Nov. Release gates remain in scope. No Appetize use.

Task 9 is implemented: legal and contact links, in-page deletion confirmation with Keep,
serialized delete-all, error/retry and completion feedback. Depends on open PR #113
(tasks 1a, 2, 3); that PR includes #111. Next eligible low-risk task: 10.

Screen pattern hold cleared: coordinator PR #115 merged into the scaffold during
this run; its new APP_PLAN.md is merged into this branch. Start, Write a letter,
My letters and kit-purchase patterns are now available. Task 9 remains a partial
low-risk batch; next task is 4 (letters and questions), alone, then 4b, alone.
Task 12 + 14 remain a separate release-gate/scorecard batch.
All five More links returned HTTP 200 on 10 Nov 2026.

Preview fixes: settlement-terms letter name replaces the retired offer, bundled fonts
are moved out of assets/node_modules before hosting, font failure renders the app,
and web previews use a centred column capped at 430 px. Based directly on the fresh
scaffold; no open task-4 branch is included. Task 4 is already in PR #117;
next task after that review is 4b. Launch stop remains unchanged.

Preview follow-up: unfinished screens show plain customer text, guarded against builder
notes. No Appetize use. Next new task: 4b (free Letter Studio, alone), after task 4 in PR #117.
Start describes letters she writes and sends herself, with no credit-repair comparison.
