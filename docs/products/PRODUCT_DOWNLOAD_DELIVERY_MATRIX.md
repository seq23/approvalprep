# Product Download Delivery Matrix

This is the operator review surface for what each paid product gives the customer after verified Stripe checkout. Every paid product unlocks exactly two protected files: one PDF guide and one editable DOCX kit. The DOCX files contain fill-in placeholders; customers either fill them manually or use the optional browser-only Letter Studio for a first-pass draft. The Studio is not required before purchase.

Runtime delivery path: `/api/verify-download` verifies the Stripe session or paid entitlement, then returns protected `/api/download-file` links for the purchased SKU only. Production files are private R2 objects using the R2 keys listed below. The kit files themselves are not in this public repository: they live in `APPROVALPREP_KITS_DIR` (default `~/.boss-os/approvalprep/kits`) and reach R2 only through `npm run ops:r2:upload`, which refuses any kit that fails the first-page safety check.

| Product | Price | Offering rows in kit | R2 keys |
|---|---:|---:|---|
| Letter of Explanation Kit | $15 | 10 | `products/letter-of-explanation/letter-of-explanation.pdf`<br>`products/letter-of-explanation/letter-of-explanation.docx` |
| Income + Employment Letter Kit | $19 | 7 | `products/income-employment-letter-kit/income-employment-letter-kit.pdf`<br>`products/income-employment-letter-kit/income-employment-letter-kit.docx` |
| Credit Letter Kit | $19 | 13 | `products/credit-letter-kit/credit-letter-kit.pdf`<br>`products/credit-letter-kit/credit-letter-kit.docx` |
| Rental Application Kit | $29 | 10 | `products/rental-application-kit/rental-application-kit.pdf`<br>`products/rental-application-kit/rental-application-kit.docx` |
| Loan Prep Letter Kit | $29 | 9 | `products/loan-prep-letter-kit/loan-prep-letter-kit.pdf`<br>`products/loan-prep-letter-kit/loan-prep-letter-kit.docx` |
| Business Funding Prep Kit | $39 | 9 | `products/business-funding-prep-kit/business-funding-prep-kit.pdf`<br>`products/business-funding-prep-kit/business-funding-prep-kit.docx` |
| Life Admin Letter Kit | $19 | 9 | `products/life-admin-letter-kit/life-admin-letter-kit.pdf`<br>`products/life-admin-letter-kit/life-admin-letter-kit.docx` |
| Complete ApprovalPrep Bundle | $49 | 57 | `products/complete-approvalprep-bundle/complete-approvalprep-bundle.pdf`<br>`products/complete-approvalprep-bundle/complete-approvalprep-bundle.docx` |

## Product Contents

### Letter of Explanation Kit (letter-of-explanation)

- Checkout price: $15
- Downloaded files (R2 keys): `products/letter-of-explanation/letter-of-explanation.pdf` and `products/letter-of-explanation/letter-of-explanation.docx`
- Production R2 keys: `downloads/letter-of-explanation.pdf`, `downloads/letter-of-explanation.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (10):
  - credit explanation letter
  - late payment explanation letter
  - income gap explanation letter
  - employment gap explanation letter
  - address history explanation letter
  - rental issue explanation letter
  - bank statement explanation letter
  - life event explanation letter
  - sent and received log
  - general application explanation letter

### Income + Employment Letter Kit (income-employment-letter-kit)

- Checkout price: $19
- Downloaded files (R2 keys): `products/income-employment-letter-kit/income-employment-letter-kit.pdf` and `products/income-employment-letter-kit/income-employment-letter-kit.docx`
- Production R2 keys: `downloads/income-employment-letter-kit.pdf`, `downloads/income-employment-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (7):
  - employment verification letter (for your employer to sign)
  - proof of income letter
  - self-employment income letter
  - bank statement explanation letter
  - job change letter
  - employment gap explanation letter
  - sent and received log

### Credit Letter Kit (credit-letter-kit)

- Checkout price: $19
- Downloaded files (R2 keys): `products/credit-letter-kit/credit-letter-kit.pdf` and `products/credit-letter-kit/credit-letter-kit.docx`
- Production R2 keys: `downloads/credit-letter-kit.pdf`, `downloads/credit-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (13):
  - credit bureau follow-up letter: no written results yet
  - credit bureau follow-up letter: the bureau says the item was verified
  - credit bureau follow-up letter: corrected, but still not right
  - request to tell recent recipients about the correction
  - statement of dispute to add to my file
  - direct dispute letter to the company that reported the item
  - debt validation letter
  - settlement terms in writing letter
  - goodwill letter
  - late payment explanation letter
  - credit report error checklist
  - mailing and record log
  - credit dispute letter

### Rental Application Kit (rental-application-kit)

- Checkout price: $29
- Downloaded files (R2 keys): `products/rental-application-kit/rental-application-kit.pdf` and `products/rental-application-kit/rental-application-kit.docx`
- Production R2 keys: `downloads/rental-application-kit.pdf`, `downloads/rental-application-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (10):
  - apartment application checklist
  - proof of income checklist
  - renter document packet: cover sheet and order
  - rental cover letter
  - rental history explanation
  - income explanation for renters
  - employment verification request (to your employer)
  - landlord follow-up letter
  - move-in document checklist
  - sent and received log

### Loan Prep Letter Kit (loan-prep-letter-kit)

- Checkout price: $29
- Downloaded files (R2 keys): `products/loan-prep-letter-kit/loan-prep-letter-kit.pdf` and `products/loan-prep-letter-kit/loan-prep-letter-kit.docx`
- Production R2 keys: `downloads/loan-prep-letter-kit.pdf`, `downloads/loan-prep-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (9):
  - auto loan explanation letter
  - mortgage explanation letter (credit inquiries and new accounts)
  - personal loan explanation letter
  - income explanation letter (variable or changed income)
  - credit explanation letter
  - bank statement explanation letter
  - loan document checklist
  - lender follow-up letter
  - sent and received log

### Business Funding Prep Kit (business-funding-prep-kit)

- Checkout price: $39
- Downloaded files (R2 keys): `products/business-funding-prep-kit/business-funding-prep-kit.pdf` and `products/business-funding-prep-kit/business-funding-prep-kit.docx`
- Production R2 keys: `downloads/business-funding-prep-kit.pdf`, `downloads/business-funding-prep-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (9):
  - business loan explanation letter
  - use of funds explanation
  - SBA document checklist
  - business income explanation
  - cash flow explanation
  - bank statement explanation (business account)
  - business address verification
  - lender follow-up letter (business application)
  - sent and received log

### Life Admin Letter Kit (life-admin-letter-kit)

- Checkout price: $19
- Downloaded files (R2 keys): `products/life-admin-letter-kit/life-admin-letter-kit.pdf` and `products/life-admin-letter-kit/life-admin-letter-kit.docx`
- Production R2 keys: `downloads/life-admin-letter-kit.pdf`, `downloads/life-admin-letter-kit.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (9):
  - address verification letter
  - proof of residency letter (signed by the person you live with)
  - name/address explanation
  - identity document checklist
  - school/employer request letter
  - general records request letter
  - benefits explanation letter
  - utility/account explanation letter
  - sent and received log

### Complete ApprovalPrep Bundle (complete-approvalprep-bundle)

- Checkout price: $49
- Downloaded files (R2 keys): `products/complete-approvalprep-bundle/complete-approvalprep-bundle.pdf` and `products/complete-approvalprep-bundle/complete-approvalprep-bundle.docx`
- Production R2 keys: `downloads/complete-approvalprep-bundle.pdf`, `downloads/complete-approvalprep-bundle.docx`
- Delivery model: direct_paid_download; Studio required: false
- Included offering rows (57):
  - credit bureau follow-up letter: no written results yet
  - credit bureau follow-up letter: the bureau says the item was verified
  - credit bureau follow-up letter: corrected, but still not right
  - request to tell recent recipients about the correction
  - statement of dispute to add to my file
  - direct dispute letter to the company that reported the item
  - debt validation letter
  - settlement terms in writing letter
  - goodwill letter
  - late payment explanation letter
  - credit report error checklist
  - credit explanation letter
  - income gap explanation letter
  - employment gap explanation letter
  - address history explanation letter
  - rental issue explanation letter
  - bank statement explanation letter
  - life event explanation letter
  - employment verification letter (for your employer to sign)
  - proof of income letter
  - self-employment income letter
  - job change letter
  - apartment application checklist
  - proof of income checklist
  - renter document packet: cover sheet and order
  - rental cover letter
  - rental history explanation
  - income explanation for renters
  - employment verification request (to your employer)
  - landlord follow-up letter
  - move-in document checklist
  - auto loan explanation letter
  - mortgage explanation letter (credit inquiries and new accounts)
  - personal loan explanation letter
  - income explanation letter (variable or changed income)
  - loan document checklist
  - lender follow-up letter
  - business loan explanation letter
  - use of funds explanation
  - SBA document checklist
  - business income explanation
  - cash flow explanation
  - bank statement explanation (business account)
  - business address verification
  - lender follow-up letter (business application)
  - address verification letter
  - proof of residency letter (signed by the person you live with)
  - name/address explanation
  - identity document checklist
  - school/employer request letter
  - general records request letter
  - benefits explanation letter
  - utility/account explanation letter
  - mailing and record log
  - sent and received log
  - credit dispute letter
  - general application explanation letter

## Validation Rules

- `npm run validate:download-first-page-boundary` checks first-page boundary/disclaimer requirements for all 16 paid files.
- `npm run validate:download-offering-coverage` checks that bundled DOCX text contains the required offering names for every paid product category.
- `npm run validate:product-flow-e2e` checks that every paid product has a product route, pricing path, Stripe checkout path, protected PDF/DOCX delivery path, optional TEST100 discount path, optional Studio prefill path, and customer review/send next step.
- The Complete ApprovalPrep Bundle must visibly list the large offering universe. It must not collapse to a vague one-row placeholder.
