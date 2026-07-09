# Day-0 VA Guide — ApprovalPrep Safe Harbor Citation OS

Status: Day-0 operator guide  
Audience: VA, operator, non-engineer  
Scope: Safe Harbor, Citation OS, approval queue, sources, workflows, paid downloads, escalation

---

## 1. What ApprovalPrep is

ApprovalPrep is a self-service document-prep and application-readiness site.

It helps people understand, prepare, organize, and explain documents for situations like:

- rental applications
- income and employment explanations
- credit-related self-service letters
- loan-prep explanations
- life-admin document requests

ApprovalPrep is not a law firm, credit repair company, lender, landlord, credit bureau, or approval service.

It does not guarantee approval, deletion, correction, funding, housing, credit outcomes, or any third-party decision.

---

## 2. What changed in the Safe Harbor Citation OS update

The repo now has a governed autopublishing system.

That means the machine can generate and publish some public pages automatically, but only after safety checks pass.

The system now includes:

- Safe Harbor autopublish rules
- prohibited-claims checks
- required disclosures
- source-required claim checks
- regulated template-preview safety
- source evidence ledgers
- unsupported-claims ledgers
- workflow write-scope checks
- self-healing logs
- conversion privacy checks
- experiment safety checks
- final readiness ledgers

A VA does not need to understand the code. A VA only needs to understand what the dashboard and files mean, what may be touched, and when to escalate.

---

## 3. The simple operating model

Safe public content may publish.

Regulated-adjacent content may publish only if Safe Harbor passes.

Fixable risky wording may be rewritten and then published.

Unsafe, unsupported, or edge-case content must be blocked or sent to the approval queue.

Paid PDF and DOCX files must never be exposed publicly.

---

## 4. What Safe Harbor means in plain English

Safe Harbor is a set of guardrails for credit, housing, loan, finance, application, and legal-adjacent content.

A page is allowed to autopublish only when it stays inside safe wording.

Safe pages may say:

- prepare truthful documents
- keep copies
- review information before sending
- use only supportable information
- this is self-service
- outcomes are not guaranteed
- users send their own documents

Unsafe pages may not say:

- guaranteed approval
- we repair your credit
- we remove negative items
- dispute accurate information
- a bureau must delete something without a source
- a landlord, lender, or state law requires something without a source
- ApprovalPrep will contact bureaus, lenders, landlords, or agencies for the user

---

## 5. Safe Harbor decision meanings

The Safe Harbor audit ledger may show these decisions:

SAFE_AUTOPUBLISH means the content passed the safety checks.

REWRITTEN_AND_AUTOPUBLISHED means the content had fixable wording, the system rewrote it safely, and then it passed.

BLOCKED_PROHIBITED_CLAIM means the content used language the site must not publish.

BLOCKED_SOURCE_REQUIRED means the content made a claim that needs a trusted source, but the source was missing.

BLOCKED_MISSING_DISCLOSURE means the content needed a safety disclaimer that was missing.

APPROVAL_REQUIRED_EDGE_CASE means the machine could not safely decide.

A VA should not override blocked decisions.

---

## 6. What “source required” means

Some claims need evidence before they can appear on public pages.

Examples:

- state law claims
- landlord obligation claims
- lender obligation claims
- credit bureau obligation claims
- legal rights claims
- official deadline claims
- government-process claims

If the system says a claim is source-required, that claim needs an approved source in the source registry or claim registry.

A candidate source is not the same thing as an approved source.

Do not treat a random article, blog post, or search result as approved evidence.

---

## 7. Paid downloads and public previews

ApprovalPrep has two different kinds of content:

Public preview pages are indexable public pages. They explain what a template or kit is for, what it helps with, and how to use it safely.

Paid downloads are protected PDF and DOCX files. They are delivered after checkout through the protected download system.

A public preview page may describe a paid kit.

A public preview page must not expose the full paid PDF or DOCX.

A public preview page must not link directly to a paid file, seed-download file, or private R2 asset.

---

## 8. What a VA may touch

A VA may:

- read admin dashboards
- read approval queues
- read workflow reports
- read Safe Harbor decisions
- read source evidence reports
- update plain-English documentation when asked
- flag confusing copy
- flag broken links
- flag missing disclosures
- flag risky claims
- flag pages that look thin or unsafe
- run approved terminal commands exactly as provided

A VA may not:

- edit validators
- edit workflow permissions
- edit paid download protection
- expose paid files publicly
- approve blocked regulated content
- invent sources
- create legal/state-law claims
- change Stripe, R2, D1, Cloudflare, or secrets
- remove disclosures
- change Safe Harbor policy without owner approval
- merge or push code unless explicitly instructed

---

## 9. What the 16 workflows do

The repo currently has 16 workflows.

A VA does not need to run them manually unless instructed.

The important idea is:

- daily workflows handle content generation, Safe Harbor checks, metrics, and validation
- weekly workflows handle source refresh, citation intelligence, maintenance, backlinks, lifecycle, and validation
- validation workflows protect the repo from unsafe or broken changes
- notification and report workflows summarize what needs attention

If a workflow fails, do not guess. Copy the failure output and escalate.

---

## 10. What “self-healing” means

Self-healing means the repo can automatically fix safe consistency problems.

Allowed self-healing examples:

- adding missing required disclosures
- rewriting fixable risky wording
- repairing route/atlas/query coverage
- refreshing sitemap files
- fixing metric shape problems
- deduping ledgers

Self-healing is not allowed to:

- invent sources
- approve legal claims
- publish hard-blocked content
- expose paid files
- fake citation wins
- fake provider data
- delete public pages without redirect protection

---

## 11. What is live proof versus fixture proof

Live proof means a real provider or production path was actually tested.

Fixture proof means the repo used mock, sample, dry-run, or local data.

Fixture proof is useful, but it is not live proof.

Do not tell anyone that live GSC, Bing, Cloudflare, Stripe, email, citation, or provider success happened unless the proof ledger explicitly says it happened.

If credentials are missing, the correct state is not configured, unavailable, or provider-gated.

---

## 12. What to do when validation fails

Do not improvise.

Use this response pattern:

1. Copy the exact failing command.
2. Copy the exact error lines.
3. Copy the evidence folder path if one exists.
4. Do not edit files manually unless instructed.
5. Escalate to the owner/operator.

A validation failure is not a crisis. It is the system doing its job.

---

## 13. Escalation triggers

Escalate immediately if you see:

- guaranteed approval language
- credit repair service language
- remove/delete credit item promises
- false-dispute instructions
- legal advice framing
- unsupported state-law claims
- missing disclosures on regulated pages
- public links to PDF or DOCX paid assets
- direct R2 or seed-download links on public pages
- workflow permission errors
- provider credential errors
- failed validation
- unclear approval queue decisions

---

## 14. Day-0 VA checklist

Before touching anything:

- confirm repo is approvalprep
- confirm you are in the repo root
- read this guide
- read docs/SYSTEM_MAP_PLAIN_ENGLISH.md
- read docs/REAL_VS_FIXTURE_DATA_GUIDE.md
- read docs/WORKFLOW_AUTOMATION_MAP.md
- do not edit code
- do not change paid downloads
- do not approve blocked content
- escalate unclear regulated claims

---

## 15. The one-sentence rule

ApprovalPrep may help users prepare truthful self-service documents, but it must not promise outcomes, act like a credit repair/legal/lending service, invent sources, or expose paid files publicly.
