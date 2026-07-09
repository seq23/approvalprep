# Product Download Delivery Matrix

This is the operator review surface for what each paid product gives the customer after verified Stripe checkout. Every paid product unlocks exactly two protected files: one PDF guide and one editable DOCX kit. The DOCX files contain fill-in placeholders; customers either fill them manually or use the optional browser-only Letter Studio for a first-pass draft. The Studio is not required before purchase.

Runtime delivery path: `/api/verify-download` verifies the Stripe session or paid entitlement, then returns protected `/api/download-file` links for the purchased SKU only. Production files are private R2 objects using the R2 keys listed below; `seed-downloads/` is the review/upload source folder.

| Product | Price | Offering rows in kit | PDF review file | DOCX review file | R2 keys |
|---|---:|---:|---|---|---|
| Letter of Explanation Kit | $39 | 9 | [PDF](../../seed-downloads/letter-of-explanation.pdf) | [DOCX](../../seed-downloads/letter-of-explanation.docx) | `downloads/letter-of-explanation.pdf`<br>`downloads/letter-of-explanation.docx` |
| Income + Employment Letter Kit | $59 | 6 | [PDF](../../seed-downloads/income-employment-letter-kit.pdf) | [DOCX](../../seed-downloads/income-employment-letter-kit.docx) | `downloads/income-employment-letter-kit.pdf`<br>`downloads/income-employment-letter-kit.docx` |
| Credit Letter Kit | $59 | 7 | [PDF](../../seed-downloads/credit-letter-kit.pdf) | [DOCX](../../seed-downloads/credit-letter-kit.docx) | `downloads/credit-letter-kit.pdf`<br>`downloads/credit-letter-kit.docx` |
| Rental Application Kit | $129 | 9 | [PDF](../../seed-downloads/rental-application-kit.pdf) | [DOCX](../../seed-downloads/rental-application-kit.docx) | `downloads/rental-application-kit.pdf`<br>`downloads/rental-application-kit.docx` |
| Loan Prep Letter Kit | $99 | 8 | [PDF](../../seed-downloads/loan-prep-letter-kit.pdf) | [DOCX](../../seed-downloads/loan-prep-letter-kit.docx) | `downloads/loan-prep-letter-kit.pdf`<br>`downloads/loan-prep-letter-kit.docx` |
| Business Funding Prep Kit | $149 | 8 | [PDF](../../seed-downloads/business-funding-prep-kit.pdf) | [DOCX](../../seed-downloads/business-funding-prep-kit.docx) | `downloads/business-funding-prep-kit.pdf`<br>`downloads/business-funding-prep-kit.docx` |
| Life Admin Letter Kit | $79 | 8 | [PDF](../../seed-downloads/life-admin-letter-kit.pdf) | [DOCX](../../seed-downloads/life-admin-letter-kit.docx) | `downloads/life-admin-letter-kit.pdf`<br>`downloads/life-admin-letter-kit.docx` |
| Complete ApprovalPrep Bundle | $249 | 50 | [PDF](../../seed-downloads/complete-approvalprep-bundle.pdf) | [DOCX](../../seed-downloads/complete-approvalprep-bundle.docx) | `downloads/complete-approvalprep-bundle.pdf`<br>`downloads/complete-approvalprep-bundle.docx` |

## Product Contents

### Letter of Explanation Kit (letter-of-explanation)

- Checkout price: $39
- Downloaded files: `seed-downloads/letter-of-explanation.pdf` and `seed-downloads/letter-of-explanation.docx`
- Production R2 keys: `downloads/letter-of-explanation.pdf`, `downloads/letter-of-explanation.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (9):
  - credit explanation letter
  - income gap explanation letter
  - employment gap explanation letter
  - address history explanation letter
  - rental issue explanation letter
  - late payment explanation letter
  - bank statement explanation letter
  - life event explanation letter
  - general application explanation letter

### Income + Employment Letter Kit (income-employment-letter-kit)

- Checkout price: $59
- Downloaded files: `seed-downloads/income-employment-letter-kit.pdf` and `seed-downloads/income-employment-letter-kit.docx`
- Production R2 keys: `downloads/income-employment-letter-kit.pdf`, `downloads/income-employment-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (6):
  - employment verification letter
  - proof of income letter
  - self-employment income letter
  - job change letter
  - gap in employment letter
  - bank statement explanation letter

### Credit Letter Kit (credit-letter-kit)

- Checkout price: $59
- Downloaded files: `seed-downloads/credit-letter-kit.pdf` and `seed-downloads/credit-letter-kit.docx`
- Production R2 keys: `downloads/credit-letter-kit.pdf`, `downloads/credit-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (7):
  - credit dispute letter
  - late payment explanation letter
  - goodwill letter
  - pay-for-delete request letter
  - debt validation letter
  - credit report error checklist
  - credit bureau follow-up letter

### Rental Application Kit (rental-application-kit)

- Checkout price: $129
- Downloaded files: `seed-downloads/rental-application-kit.pdf` and `seed-downloads/rental-application-kit.docx`
- Production R2 keys: `downloads/rental-application-kit.pdf`, `downloads/rental-application-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (9):
  - apartment application checklist
  - rental cover letter
  - rental history explanation
  - income explanation for renters
  - employment verification request
  - proof of income checklist
  - landlord follow-up letter
  - move-in document checklist
  - renter document packet

### Loan Prep Letter Kit (loan-prep-letter-kit)

- Checkout price: $99
- Downloaded files: `seed-downloads/loan-prep-letter-kit.pdf` and `seed-downloads/loan-prep-letter-kit.docx`
- Production R2 keys: `downloads/loan-prep-letter-kit.pdf`, `downloads/loan-prep-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (8):
  - auto loan explanation letter
  - mortgage explanation letter
  - personal loan explanation letter
  - income explanation letter
  - credit explanation letter
  - bank statement explanation letter
  - loan document checklist
  - lender follow-up letter

### Business Funding Prep Kit (business-funding-prep-kit)

- Checkout price: $149
- Downloaded files: `seed-downloads/business-funding-prep-kit.pdf` and `seed-downloads/business-funding-prep-kit.docx`
- Production R2 keys: `downloads/business-funding-prep-kit.pdf`, `downloads/business-funding-prep-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (8):
  - business loan explanation letter
  - SBA document checklist
  - business income explanation
  - cash flow explanation
  - bank statement explanation
  - business address verification
  - use of funds explanation
  - lender follow-up letter

### Life Admin Letter Kit (life-admin-letter-kit)

- Checkout price: $79
- Downloaded files: `seed-downloads/life-admin-letter-kit.pdf` and `seed-downloads/life-admin-letter-kit.docx`
- Production R2 keys: `downloads/life-admin-letter-kit.pdf`, `downloads/life-admin-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (8):
  - address verification letter
  - proof of residency letter
  - name/address explanation
  - identity document checklist
  - school/employer request letter
  - benefits explanation letter
  - utility/account explanation letter
  - general records request letter

### Complete ApprovalPrep Bundle (complete-approvalprep-bundle)

- Checkout price: $249
- Downloaded files: `seed-downloads/complete-approvalprep-bundle.pdf` and `seed-downloads/complete-approvalprep-bundle.docx`
- Production R2 keys: `downloads/complete-approvalprep-bundle.pdf`, `downloads/complete-approvalprep-bundle.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (50):
  - credit explanation letter
  - income gap explanation letter
  - employment gap explanation letter
  - address history explanation letter
  - rental issue explanation letter
  - late payment explanation letter
  - bank statement explanation letter
  - life event explanation letter
  - general application explanation letter
  - employment verification letter
  - proof of income letter
  - self-employment income letter
  - job change letter
  - gap in employment letter
  - credit dispute letter
  - goodwill letter
  - pay-for-delete request letter
  - debt validation letter
  - credit report error checklist
  - credit bureau follow-up letter
  - apartment application checklist
  - rental cover letter
  - rental history explanation
  - income explanation for renters
  - employment verification request
  - proof of income checklist
  - landlord follow-up letter
  - move-in document checklist
  - renter document packet
  - auto loan explanation letter
  - mortgage explanation letter
  - personal loan explanation letter
  - income explanation letter
  - loan document checklist
  - lender follow-up letter
  - business loan explanation letter
  - SBA document checklist
  - business income explanation
  - cash flow explanation
  - bank statement explanation
  - business address verification
  - use of funds explanation
  - address verification letter
  - proof of residency letter
  - name/address explanation
  - identity document checklist
  - school/employer request letter
  - benefits explanation letter
  - utility/account explanation letter
  - general records request letter

## Validation Rules

- `npm run validate:download-first-page-boundary` checks first-page boundary/disclaimer requirements for all 16 paid files.
- `npm run validate:download-offering-coverage` checks that bundled DOCX text contains the required offering names for every paid product category.
- `npm run validate:product-flow-e2e` checks that every paid product has a product route, pricing path, Stripe checkout path, protected PDF/DOCX delivery path, optional TEST100 discount path, optional Studio prefill path, and customer review/send next step.
- The Complete ApprovalPrep Bundle must visibly list the large offering universe. It must not collapse to a vague one-row placeholder.
