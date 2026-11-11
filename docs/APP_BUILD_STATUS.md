# App build queue — 10 Nov 2026

Task 1 PR is green and awaits coordinator review.
Task 2 is implemented in its own dependent PR against the scaffold branch.
Next task: 3. Coordinator lands task 1 before task 2; agents never merge.

Preview: CI exports the app for the web and puts a free download shortcut in its
run summary. Download, unzip and serve with `python3 -m http.server 8080`.
No Appetize uploads or minutes. This is a downloadable preview, not hosted hosting.

NAMED STOP [WAITS_FOR_LAUNCH_PLAN]: task 11 (store files) wait for the owner's launch plan after 13 Nov. Release gates remain in scope.

Tasks are grouped into PRs by risk (owner, 10 Nov 2026 evening); see the queue brief. Task 1a (a hosted preview link) comes before task 2. "Pay for delete" is retired: the kit's letter is "settlement terms in writing".

Task 1a: CI publishes a noindex Cloudflare Pages web preview and posts its link in the summary and PR. Missing credentials, refused deploys and missing URLs fail with NAMED STOP [PREVIEW_HOST_FAILED]. Next: task 3, after the open task 2 PR is reviewed.
