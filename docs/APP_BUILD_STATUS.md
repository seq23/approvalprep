# App build queue — 10 Nov 2026

Task 1 is merged into the scaffold branch.
Task 2 is implemented in its own dependent PR against the scaffold branch.
Task 3: SQLite storage is implemented and tested for create/update/delete/delete-all,
restart persistence, stable order, rapid saves and bound user inputs. Native uses
expo-sqlite; the hosted preview supports its WASM and isolation headers.
Next task: 4 (letters and questions), then 4b (Studio; S2 pattern notes needed). Coordinator lands task 1 before task 2; agents never merge.

Task 1a: CI publishes the web export to the app's separate free Cloudflare Pages
project. The first summary line and PR comment contain the preview URL; noindex
headers and robots.txt discourage indexing. Missing credentials, refused deployment
or no deployment URL fail with NAMED STOP [PREVIEW_HOST_FAILED].
No Appetize uploads or minutes. Website hosting is untouched.

NAMED STOP [PATTERN_NOTES_MISSING] Start (S1); Write a letter (S2); My letters (7); kit purchase screens (8, 13, 13b).
The scaffold plan has no Screen patterns section as of this run. Do not extend those
screens until the coordinator adds the shipped-example structure notes.

NAMED STOP [WAITS_FOR_LAUNCH_PLAN]: task 11 (store files) wait for the owner's launch plan after 13 Nov. Release gates remain in scope.

Tasks are grouped into PRs by risk (owner, 10 Nov 2026 evening); see the queue brief. Task 1a (a hosted preview link) comes before task 2. "Pay for delete" is retired: the kit's letter is "settlement terms in writing".
