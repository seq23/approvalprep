# Content Approval Workflow

ApprovalPrep V1 has no backend writeback. The admin panel uses GitHub-native edit/history links.

To approve content, open the manifest edit link, set `status` to `approved`, set or adjust `scheduledAt`, and commit through a branch or pull request. Regulated credit/legal/payment/download/prompt changes require human review before publishing.

---

# Safe Harbor Approval Queue Addendum

Regulated content no longer goes to approval automatically just because it is regulated.

It may autopublish when Safe Harbor passes.

It must enter the approval queue when:

- a prohibited claim remains
- required source coverage is missing
- required disclosure is missing
- the page creates an edge case
- the system cannot safely classify the content

A human should review the reason, not just the page title.
