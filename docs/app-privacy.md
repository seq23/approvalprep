# App Store privacy label (App Privacy): what we declared and why

Published in App Store Connect on 16 Nov 2026 (app 6834891489). Every answer comes from the code in `apps/mobile` and `functions/api` on `main` at that date. The label is a legal statement to Apple, so when the app starts collecting something new, or stops, update this file and the label together.

Privacy policy URL on the label: `https://approvalprep.com/privacy`.

## Declared (none of it is used for tracking)

| Apple data type | Linked to the user | Purpose | Where it comes from in the code |
|---|---|---|---|
| Email Address | Yes | App Functionality | "Email you paid with" (More tab) → `POST /api/email-download-links` (`apps/mobile/src/purchases/websiteUnlock.ts`). The server looks the address up in Stripe and emails the links through Resend (`functions/_runtime/resend-download.js`). It is not added to any marketing list. |
| Purchase History | Yes | App Functionality, Analytics | RevenueCat in-app purchases (`apps/mobile/src/purchases/revenuecat.ts`, `bundleAccount.ts`), plus website-order unlock by order number (`/api/app-website-unlock`). It counts as linked because a website order can be found by the buyer's email. |
| User ID | No | App Functionality | The anonymous RevenueCat app user id, sent as the bearer to `/api/app-unlock`, `/api/app-bundle` and `/api/app-files` |

## Not declared, and why

- RevenueCat runs with `diagnosticsEnabled: false` and `automaticDeviceIdentifierCollectionEnabled: false`, so there is no Device ID and no Diagnostics.
- The app has no account, no analytics SDK and no crash SDK. Reminders are local notifications (`apps/mobile/src/localReminders.ts`), with no push token.
- Letters, answers and kits stay on the phone (SQLite). No fetch sends user content.
- Tracking: none.

## The policy does not match the code

- `https://approvalprep.com/privacy` describes the website only. It never mentions the iPhone app, RevenueCat, in-app purchases, or the in-app "email you paid with" lookup. It needs a short "The ApprovalPrep app" section.
