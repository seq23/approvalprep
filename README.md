# ApprovalPrep

ApprovalPrep is a self-service approval prep site. It helps people get truthful letters, checklists, and document packets ready before they apply for housing, credit, employment checks, car loans, business loans, mortgages, and other life-admin moments.

ApprovalPrep is not a credit repair company, law firm, lender, landlord, broker, or employment verification service.

## What the site sells

- Letter of Explanation
- Employment Verification Letter
- Proof of Income Letter
- Credit Dispute Letter
- Letter Studio Bundle
- Apartment Application Kit

## How checkout and downloads work

1. A visitor chooses a product or guide.
2. Stripe Checkout handles payment.
3. Stripe verifies the paid session.
4. Download access is released only after verification.
5. Resend can email the download link.
6. No user account is created in V1.
7. No customer documents are saved in V1.

## What runs automatically

- repo validation
- SEO/AEO/GEO checks
- citation strategy updates
- workflow fixture traces
- scheduled content release
- delegated authority decisions
- safe self-healing
- notification queue generation
- browserless UX checks

## What needs the owner

Almost nothing routine. Owner exceptions are limited to true owner decisions, material legal or policy changes, payment/account ownership, compromised secrets, production deletion, or failures the system cannot safely fix.

## First 30 minutes

1. Read `docs/DAY_0_OPERATOR_GUIDE.md`.
2. Run `npm install --ignore-scripts`.
3. Run `npm run validate:all`.
4. Run `npm run build`.
5. Run `npm run workflows:trace`.
6. Open `/admin` after deploy.
7. Configure secrets with `npm run setup:secrets`.

## Fixture data vs live proof

Fixture data proves workflow paths and no-credential behavior. It does not prove live Stripe, Resend, Google Search Console, Bing, IndexNow, Cloudflare, GitHub Actions, or real citation wins.


## Postdeploy validation base URL

Use `https://approvalprep.pages.dev` for postdeploy smoke checks. Set `POSTDEPLOY_BASE_URL=https://approvalprep.pages.dev` and `PLAYWRIGHT_BASE_URL=https://approvalprep.pages.dev` when running postdeploy/browser validation.
