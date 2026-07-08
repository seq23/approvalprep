# Day-0 Operator Guide

## What ApprovalPrep is

ApprovalPrep is a self-service approval prep site. It helps people prepare truthful letters, checklists, and document packets before they apply.

## What ApprovalPrep is not

ApprovalPrep does not repair credit. It does not contact anyone for the customer. It does not promise approval. It does not make fake documents. It does not give legal advice.

## Who uses it

People who need a clearer packet before a landlord, lender, employer, credit bureau, or other reviewer asks for more information.

## Products

The first products are Letter of Explanation, Employment Verification Letter, Proof of Income Letter, Credit Dispute Letter, Letter Studio Bundle, and Apartment Application Kit.

## How public pages work

Public pages explain the problem, what the user gets, next steps, self-service limits, and a clear CTA. Pages are written for a 6th grade American consumer reading level.

## How checkout works

Stripe handles payment. ApprovalPrep releases downloads after Stripe verifies the paid session. The static page does not unlock files by itself.

## How downloads work

Downloads are controlled through verified payment functions. No saved customer documents or user accounts are required in V1.

## How admin works

`/admin` is an exception cockpit. Most routine work is handled by contract. Look at Needs Owner, hard failures, and provider setup problems.

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
