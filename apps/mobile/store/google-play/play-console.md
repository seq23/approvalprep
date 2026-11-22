# Google Play listing and form answers (draft)

Nothing here is sent to Google. The listing goes up under the **company** Play account
(Redwood Reserve Holdings LLC) once its D-U-N-S number arrives; there is no personal Play account.
Wording follows risk rule R-ADV-13 (self-help templates only). `tests/store.test.ts` and
`tests/self-help.test.ts` check the lengths, the closing self-help line and the no-promise rule.

## Store listing

| Field | Limit | Value |
|---|---|---|
| App name | 30 | `name` in `../listing.json` (ApprovalPrep: Credit Disputes) |
| Short description | 80 | `play_short_description` in `../listing.json` |
| Full description | 4000 | `full-description.txt` (from the approved Apple copy, `../en.md`) |
| Category | | Productivity |
| Tags | | Productivity, Personal finance tools. No hashtags in any field (never `#creditrepair`). |
| Privacy policy | | https://approvalprep.com/privacy/ |

## Graphics (made by `npm run play:assets`, see `scripts/make-play-assets.mjs`)

- `icon-512.png`: 512 x 512, from `assets/icon.png`.
- `feature-graphic.png`: 1024 x 500, tagline "Dispute it yourself. Skip the monthly fee." with the self-help line.
- `screenshots/*.png`: five 1080 x 1920 phone screenshots of the real app (web build, sample letters loaded).
- Adaptive icon: already set in `app.config.ts` (`assets/adaptive-icon.png` on #FF7A3D).

## In-app products (the shared `~/bin/play-products` tool, catalog `scripts/store/play-products.mjs`)

The 14 one-time products (7 kits, the Complete Bundle, 6 bundle-upgrade tiers) are created on Play from the
app's own code: ids from the RevenueCat catalog (`scripts/revenuecat/setup.ts`), USD prices from `src/kit.ts`
and `src/lib/appUpgrade.mjs`, every other region from Google's own price conversion, titles and descriptions
from `src/offers.ts` (no price in the text: Play shows it in the buyer's currency). The tool lives in seq-bin
(`~/bin/play-products`, one copy for every app); this repo keeps only the catalog. Re-run it after any product
change: it creates what is missing (each product read again just before it is written), activates only
drafts, and never deletes, deactivates or reprices. A different US price on Play prints `MISMATCH`; a product
switched off on Play prints `SWITCHED OFF`; both are left as they are.

**Never more than the bundle, in any region.** Each upgrade carries a ceiling: every set of kits that leads to
it (`upgradeFor`) plus the upgrade must not cost more than the Complete Bundle. Play converts each price on its
own, so the tool lowers an upgrade's price in a region just enough to stay under; the US price stays the code
price. A live price that breaks it is a `MISMATCH`.

```
cd ~/GitHub/boss-os && npm run -s vault:run -- ~/bin/play-products ~/GitHub/approvalprep/apps/mobile/scripts/store/play-products.mjs           # dry run: the plan
cd ~/GitHub/boss-os && npm run -s vault:run -- ~/bin/play-products ~/GitHub/approvalprep/apps/mobile/scripts/store/play-products.mjs --apply   # create, activate, read back
```

`--apply` writes nothing while RevenueCat still holds any of these products on Play with another type
(`NAMED STOP [RC_TYPES_NOT_READY]`: a sale would be consumed); run `~/bin/revenuecat-setup` first.

Exit 0 means Play matches; 3 means a dry run with work left; 1 a failure or mismatch; 2 a named stop. Done
means the `--apply` run ends `read-back on com.approvalprep.app: 14/14 active …` and a dry run after it exits 0.
A failure (401/403, 429, 5xx, network) stops every write and prints Google's answer; re-run once it clears.
`NAMED STOP [PLAY_PERMISSION_DENIED]`: the service account in `GOOGLE_PLAY_UPLOAD_SA_JSON` lacks "Manage store
presence" on this app in Play Console (a new grant can take up to 36 hours to reach the API). Tests: the
catalog in `tests/playProducts.test.ts`, the tool in seq-bin `tests/store/`.

## Financial features declaration (Policy > App content)

Answer, reviewed against R-ADV-13 and Play Help 13849271:

- **Does the app provide financial features?** Yes, one: **Support services → Other**.
- **Describe "Other":** "Self-help letter templates. Users write and mail their own letters; we never contact bureaus or creditors."
- **Never tick:** credit monitoring and reporting, loans of any kind, financial advice or planning,
  banking, payments, crypto, insurance, debt relief or debt settlement services. ApprovalPrep does none of them: it
  sells one-time letter templates and never reads a report, tracks a dispute or acts for the buyer.
- If Play asks for a licence: none is held or needed, because the app offers no regulated financial service.

## Permissions in the Android build

`app.config.ts:14-17` blocks every permission the app does not use (`tests/store.test.ts` fails if one comes back).
SYSTEM_ALERT_WINDOW and READ/WRITE_EXTERNAL_STORAGE were in the 19 Nov 2026 AAB; nothing uses an overlay, and
letters and kits are written to the app's own cache and document folders (`src/letterExport.ts:16`, `src/purchases/kitFiles.ts:24-26`).

Final manifest, EAS preview build 691df3dc-6a18-4e90-a8a2-687e6e96af3a (free plan, 19 Nov 2026, this branch):
INTERNET, ACCESS_NETWORK_STATE, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, WAKE_LOCK, READ_APP_BADGE,
plus Google Play's install-referrer/billing and launcher badge permissions added by libraries. BIND_JOB_SERVICE and
DUMP appear only as protections on library services and receivers, not as requested permissions.

## Data safety (Policy > App content > Data safety)

Derived from the code on `main`, the same reading as the Apple label (`docs/app-privacy.md`). Paths are
under `apps/mobile/` unless they start with `functions/` or `src/components/`.

- **Does your app collect or share any of the required user data types?** Yes.
- **Is all of the user data collected by your app encrypted in transit?** Yes. Every request goes to
  `https://approvalprep.com` (`src/purchases/kitFileLinks.ts:4`, `delivery.ts:3`, `bundleDelivery.ts:3`) or RevenueCat over HTTPS.
- **Do you provide a way for users to request that their data is deleted?** Yes. URL:
  `https://approvalprep.com/privacy/` (section "Deleting your app data", `src/components/LegalPolicyPage.astro:31-34`):
  email info@approvalprep.com with "delete my app data". On the phone, More > "Delete all my letters"
  (`app/(tabs)/more/index.tsx:102`); uninstalling removes everything else.
- **Account creation:** "My app does not allow users to create an account" (no login anywhere; the only id is RevenueCat's anonymous one).
- **Shared with third parties:** none. RevenueCat (purchases), Stripe (website order lookup) and Resend (sending the link email)
  act for us as service providers, which Google does not count as sharing.

| Play data type | Collected | Shared | Ephemeral | Required? | Purpose | Code |
|---|---|---|---|---|---|---|
| Financial info > Purchase history | Yes | No | No | Required (only when buying) | App functionality, Analytics | RevenueCat with Google Play Billing (`src/purchases/revenuecat.ts:7`, `bundleAccount.ts:48`); website order code (`websiteUnlock.ts:20`) |
| Personal info > Email address | Yes | No | No | Optional (only if typed) | App functionality | More > "Email you paid with" (`app/(tabs)/more/index.tsx:92`) → `websiteUnlock.ts:52` → `functions/api/email-download-links.js` (Stripe lookup, link emailed; a one-way hash is kept briefly to stop repeat tries) |
| App info and performance; Device or other IDs | Device or other IDs: Yes | No | No | Required (only when buying or opening a kit) | App functionality | The anonymous RevenueCat app user id, sent as the bearer token (`delivery.ts:14`, `bundleDelivery.ts:25`, `kitFiles.ts:12`), and, on Android only when a Play review code is typed, with that code (`purchases/review.ts`). Not linked to a name or email. |

Not declared, and why:
- Letters, answers, drafts, mailing dates: kept on the phone in SQLite (`src/phoneDatabase.ts:47`); no fetch sends them.
- Location, contacts, photos, audio, files: none read; the permissions are blocked (`app.config.ts:14-17`).
- Diagnostics / crash logs / advertising id: RevenueCat runs with `diagnosticsEnabled: false` and
  `automaticDeviceIdentifierCollectionEnabled: false` (`revenuecat.ts:7`); no analytics, crash or ad SDK in `package.json`.
- Reminders are local notifications with no push token (`src/localReminders.ts:5`).
- The server keeps a short-lived one-way hash of the network address for abuse limits; it is not used for location.

## Content rating (IARC questionnaire)

- Category: **All other app types** (reference, tools, productivity).
- Violence, fear, sexuality, nudity, profanity or crude humour, drugs, alcohol, tobacco, gambling or simulated gambling: **No** to every question.
- Users interact or exchange content with each other: **No** (no chat, no upload, no sharing between users).
- Shares the user's current physical location with other users: **No**.
- Allows users to purchase digital goods: **Yes** (one-time letter kits through Google Play Billing).
- Unrestricted internet access (a browser or search): **No**; it opens only approvalprep.com and ftc.gov pages (`src/more.ts:2-12`, `src/copy.ts:12`).
- Expected result: Everyone / PEGI 3, with the "In-App Purchases" notice.

## Target audience and content

- **Target age:** 18 and over only. The app is about the user's own credit report and letters to bureaus and creditors,
  which is adult business; nothing in the code is built for children.
- **Could the app appeal to children unintentionally?** No.

## Ads

- **Does your app contain ads?** No. No ad SDK in `package.json`, no ad network calls; the privacy policy says "No tracking and no ad networks" (`src/components/LegalPolicyPage.astro:27`).

## App access (notes for the reviewer)

Play Console > App content > App access > Sign in details: Username `No account needed`; Password = the review
code (the Boss OS vault `AP_PLAY_REVIEW_CODE`, copied with
`cd ~/GitHub/boss-os && npm run -s vault:run -- sh -c 'printf %s "$AP_PLAY_REVIEW_CODE" | pbcopy'`; never typed here
or in the app); tick full access including paid content; paste the note below as "Any other instructions"
(tests/reviewUnlock.test.ts holds it to 500 characters and to the screen's own labels). The code works only while the
review window on the Pages project is open (`REVIEW_UNTIL`, kept open while the app is live on Play, renewed
yearly); how it works and how to rotate it: `docs/APP_BUNDLE_DELIVERY.md` ("Play review access").

> No account or sign-in. The free credit bureau dispute letter works at once from Home. To open every paid kit free: More > Have a review code?, type the 10-digit code from the password field, tap Use this code. The Complete Bundle (both letter kits and every kit's PDF and Word file) opens for 7 days. Self-help templates only: the app never contacts a bureau or creditor. 'Open my website kit' needs a website order; skip it.

## Other declarations

- **Health apps:** No health features.
- **Government apps:** No. Not made for or on behalf of a government; the FTC link is a public source (`src/copy.ts:12`).
- **News apps:** No.
- **AI-generated content:** No. Letters are built on the phone from fixed templates and the user's answers
  (`src/studio.ts:1-3`, shared `src/data/letterStudio`); no AI model or AI API is called, so no in-app AI report control is needed.
- **Account deletion:** the app has no accounts (RevenueCat's anonymous id only). Answer "No, my app does not allow users to
  create an account". "Delete all my letters" is in More.
- **Privacy policy:** `https://approvalprep.com/privacy/` covers the iPhone and Android app (`src/components/LegalPolicyPage.astro:17`).
