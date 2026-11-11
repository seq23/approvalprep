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

NAMED STOP [PATTERN_NOTES_MISSING] Start (S1), Write a letter (S2), My letters (S6),
Credit Letter Kit (S7), explanation-kit purchase, complete-bundle purchase.
The scaffold plan has no Screen patterns section as of this run. Tasks 4 and 4b need
S2 and are parked; 5 and 6 depend on the unfinished letter flow; 7, 8, 13 and 13b
wait for their listed screen patterns. No customer letter content was invented.
Task 12 + 14 remain a separate release-gate/scorecard batch.
Task 10 also waits for NAMED STOP [PATTERN_NOTES_MISSING] Start (S1), because its
shortcut changes that screen. This partial low-risk batch contains task 9 only.
All five More links returned HTTP 200 on 10 Nov 2026.
