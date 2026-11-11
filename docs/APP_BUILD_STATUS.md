# App build queue — 10 Nov 2026

Task 4 is complete in the app. The free bureau dispute letter is bundled; the four kit letters
(goodwill, debt validation, settlement terms in writing, follow-up) run the same question-per-screen
flow from a kit delivered to the phone (`apps/mobile/src/kitTemplates.ts`), and show
"included in the kit" until one is delivered. No paid wording is in this repo (guard:
`apps/mobile/tests/kitTemplates.test.ts`).
Private templates are written, outside the repo: `~/.boss-os/approvalprep/app-templates/credit-letter-kit.json`.
Not done here: the upload to R2 (the coordinator's) and the purchase door (tasks 8 and 13).
NAMED STOP [WAITS_FOR_LAUNCH_PLAN]: task 11 (store files) waits for the owner's launch plan.
Next task: 4b (the free Letter Studio), alone.
