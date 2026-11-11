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

Task 4 is IN PROGRESS in work/ap-letters-1110 (one task PR; resume this PR).
The free bureau dispute flow asks six questions, saves each answer on the phone,
reopens by letter ID, and renders the website's shared letter and sourced bureau address.
Blank answers remain bracketed; save errors block Next and offer Retry.
Remaining task 4: port the four private kit templates and their guided questions,
with one rendered-letter test per kind. The existing source DOCX is outside the repo
at ~/.boss-os/approvalprep/kits/credit-letter-kit.docx. Never copy it into this repo.
NAMED STOP [PRIVATE_TEMPLATE_WRITE_DENIED]: this execution environment permits writes
only inside GitHub and temporary directories. Generating the four private template
files requires write access to APPROVALPREP_KITS_DIR, outside those allowed roots.
Paid template text remains outside the app. Next task remains 4, then 4b.
