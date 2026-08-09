# Day-0 Operator Guide

## What ApprovalPrep is

ApprovalPrep is a self-service approval prep site. It helps people prepare truthful letters, checklists, and document packets before they apply.

## What ApprovalPrep is not

ApprovalPrep does not repair credit. It does not contact anyone for the customer. It does not promise approval. It does not make fake documents. It does not give legal advice.

## Who uses it

People who need a clearer packet before a landlord, lender, employer, credit bureau, or other reviewer asks for more information.

## Products

The live paid catalog currently includes eight products: Letter of Explanation; Income + Employment Letter Kit; Credit Letter Kit; Rental Application Kit; Loan Prep Letter Kit; Business Funding Prep Kit; Life Admin Letter Kit; and the Complete ApprovalPrep Bundle. The maintained catalog source is `docs/products/LIVE_PRODUCT_CATALOG.md`; use that file instead of copying product IDs or prices into operator notes.

## How public pages work

Public pages explain the problem, what the user gets, next steps, self-service limits, and a clear CTA. Pages are written for a 6th grade American consumer reading level.

## How checkout works

Stripe handles payment. ApprovalPrep releases downloads after Stripe verifies the paid session. The static page does not unlock files by itself.

## How downloads work

Downloads are controlled through verified payment functions. No saved customer documents or user accounts are required in V1.

ApprovalPrep must not store customer letter answers, completed worksheets, filled-in templates, or uploaded personal application documents. The runtime may keep limited operational records such as Stripe session IDs, product IDs, payment status, timestamps, product asset records, and admin audit records so purchases can be verified and files can be delivered.

## How admin works

`/admin` has two operator roles. The growth/SEO cockpit is primarily an exception-and-health surface. The product admin area is the real commerce mutation surface for creating, publishing, hiding, uploading assets for, and revoking products. Before mutating products, read `docs/products/PRODUCT_ADMIN_RUNBOOK.md`; for rollback/recovery, read `docs/products/PRODUCT_ROLLBACK_RUNBOOK.md`.

## How automation works

GitHub Actions validate, refresh data, trace workflows with fixture data, build health reports, and prepare safe releases.

## How delegated authority works

Routine safe work is approved by contract. The system acts when work is safe, reversible, on-brand, clear, and within the strategy.

## How self-healing works

When something is risky but fixable, the system tries a safe repair, checks it again, and only blocks when no safe repair remains.

## How notifications work

Normal success stays quiet. Owner exceptions and hard failures create queue items. Resend can send email when configured.

## How to validate

Run `npm run validate:all`, `npm run build`, and `npm run workflows:trace`.

## How to recover

Read the failing validator, fix only the failing file or rule, rerun validation, then package a new full ZIP snapshot.

---

# Safe Harbor Citation OS — Day-0 Addendum

For the current ApprovalPrep repo, Day-0 operators should also read:

- `docs/DAY_0_VA_SAFE_HARBOR_CITATION_OS_GUIDE.md`
- `docs/SYSTEM_MAP_PLAIN_ENGLISH.md`
- `docs/REAL_VS_FIXTURE_DATA_GUIDE.md`
- `docs/WORKFLOW_AUTOMATION_MAP.md`
- `docs/admin/CONTENT_APPROVAL_WORKFLOW.md`
- `docs/automation/HANDS_OFF_AUTOMATION_POLICY.md`
- `docs/products/PRODUCT_ADMIN_RUNBOOK.md`
- `docs/products/PRODUCT_ROLLBACK_RUNBOOK.md`
- `docs/products/LIVE_PRODUCT_CATALOG.md`

Plain-English rule:

ApprovalPrep can autopublish safe educational and template-preview content only when the Safe Harbor checks pass. Regulated, unsupported, or edge-case content must block or enter the approval queue. Paid PDF and DOCX files must remain protected behind checkout.
