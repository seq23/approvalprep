# Download Asset Review Index

These are the consumer files currently offered after verified checkout. Each active paid product has one PDF and one DOCX. Every paid product is a direct paid download; the free Studio is optional and not required.

| Product | SKU | R2 keys |
|---|---|---|
| Letter of Explanation Kit | `letter-of-explanation` | `products/letter-of-explanation/letter-of-explanation.pdf`<br>`products/letter-of-explanation/letter-of-explanation.docx` |
| Income + Employment Letter Kit | `income-employment-letter-kit` | `products/income-employment-letter-kit/income-employment-letter-kit.pdf`<br>`products/income-employment-letter-kit/income-employment-letter-kit.docx` |
| Credit Letter Kit | `credit-letter-kit` | `products/credit-letter-kit/credit-letter-kit.pdf`<br>`products/credit-letter-kit/credit-letter-kit.docx` |
| Rental Application Kit | `rental-application-kit` | `products/rental-application-kit/rental-application-kit.pdf`<br>`products/rental-application-kit/rental-application-kit.docx` |
| Loan Prep Letter Kit | `loan-prep-letter-kit` | `products/loan-prep-letter-kit/loan-prep-letter-kit.pdf`<br>`products/loan-prep-letter-kit/loan-prep-letter-kit.docx` |
| Business Funding Prep Kit | `business-funding-prep-kit` | `products/business-funding-prep-kit/business-funding-prep-kit.pdf`<br>`products/business-funding-prep-kit/business-funding-prep-kit.docx` |
| Life Admin Letter Kit | `life-admin-letter-kit` | `products/life-admin-letter-kit/life-admin-letter-kit.pdf`<br>`products/life-admin-letter-kit/life-admin-letter-kit.docx` |
| Complete ApprovalPrep Bundle | `complete-approvalprep-bundle` | `products/complete-approvalprep-bundle/complete-approvalprep-bundle.pdf`<br>`products/complete-approvalprep-bundle/complete-approvalprep-bundle.docx` |

## Live Checkout Boundary

These files being present does not prove Stripe checkout works. Live checkout is proven only by a deployed smoke test that posts every active SKU to `/api/create-checkout-session` and receives a Stripe Checkout URL.
