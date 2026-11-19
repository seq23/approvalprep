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

## Financial features declaration (Policy > App content)

Answer, reviewed against R-ADV-13 and Play Help 13849271:

- **Does the app provide financial features?** Yes, one: **Support services → Other**.
- **Describe "Other":** "Self-help letter templates. Users write and mail their own letters; we never contact bureaus or creditors."
- **Never tick:** credit monitoring and reporting, loans of any kind, financial advice or planning,
  banking, payments, crypto, insurance, debt relief or debt settlement services. ApprovalPrep does none of them: it
  sells one-time letter templates and never reads a report, tracks a dispute or acts for the buyer.
- If Play asks for a licence: none is held or needed, because the app offers no regulated financial service.

## Other forms

- **Account deletion:** the app has no accounts (RevenueCat's anonymous id only). Answer "No, my app does not allow users to create an account". "Delete all my letters" is in More.
