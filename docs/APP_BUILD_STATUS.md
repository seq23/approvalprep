# ApprovalPrep phone app: build status (13 Nov 2026)

Plan: `docs/APP_PLAN.md`. Build branch: `apps/approvalprep-scaffold` (draft PR #84 carries it to
`main`). The coordinator holds the review of the whole branch.

## Built (code and a test for each, on the build branch)

| Plan task | State | Where |
|---|---|---|
| 1, 1a Scaffold and the free web preview link | Built | `.github/workflows/app-preview.yml`, `apps/mobile/scripts/preview/host.mjs` |
| 2 Components | Built | `apps/mobile/src/ui.tsx`, `tests/ui.test.ts` |
| 3 On-phone storage | Built; a stalled store ends in "Try again", never a spinner | `src/letterStorage.ts`, `src/phoneDatabase.ts` |
| 4 Letters and questions | Built; optional blanks (`{{field?|Prompt}}`) print nothing when skipped | `src/kitTemplates.ts` |
| 4b Free Letter Studio | Built; "What the kit adds" lists what the in-app kit holds and opens it | `src/studio.ts` |
| 5 Your letter (PDF, share, print) | Built | `src/letterPdf.ts`, `src/letterExport*.ts` |
| 6 Mark as sent, reminder, day-30 answer screen | Built | `src/sentLetter.ts`, `src/answerLetter.ts` |
| 7 My letters | Built | `src/myLetters.ts` |
| 8 Credit Letter Kit purchase | Built, switched off | `src/kit.ts`, `src/purchases/`, `functions/api/app-unlock.js` |
| 9 More | Built (Restore purchase row, free "The bureau answered" page) | `src/more.ts` |
| 10 Preview samples | Built | `src/previewSamples.ts` |
| 12 Release gate | Built | `apps/mobile/scripts/release-gate.mjs` |
| 13 Letter of Explanation Kit | Built, switched off | `tests/explanationKit.test.ts` |
| 13b Complete Bundle | Built, switched off | `src/purchases/bundle*.ts`, `functions/api/app-bundle.js`, `docs/APP_BUNDLE_DELIVERY.md` |
| 14 Scorecard row | Registered: row `ap-phone-app` (seq23/boss-os#388, merged 13 Nov 2026), date recorded in `apps/mobile/release/scorecard.json` | `tests/releaseGate.test.ts` |
| Start screen (pattern e) | Built: her next answer date and latest letters once she has some | `src/start.ts` |

## Named stops (each is in code; none is a silent pass)

- `NAMED STOP [STORE_ACCOUNTS_NOT_READY]`: `KIT_SALES_ENABLED = false` in `apps/mobile/src/kit.ts`.
  Buying is off until the company store accounts, the store products and RevenueCat exist (the
  owner opens those). Nothing is created in a store by this branch.
- `NAMED STOP [REVENUECAT_SECRET_MISSING]`: the server doors answer 503 until the server secret
  `APPROVALPREP_REVENUECAT_SECRET` is set. No paid file can leave before that.
- `NAMED STOP [BUNDLE_ID_PLACEHOLDER]`, `[REVENUECAT_KEY_MISSING]`, `[PREVIEW_FLAG_SET]`: release
  gate, see `apps/mobile/release/README.md`.
- `NAMED STOP [WAITS_FOR_LAUNCH_PLAN]`: task 11 (store files) waits for the owner's launch plan.
  `apps/mobile/store/en.md` now says only what the app delivers (13 Nov 2026): mark as sent
  belongs to the kit, and the PDF guides come with the bundle.
- Private kit files: both are in the private bucket (`app-kits/credit-letter-kit.json`,
  `app-kits/letter-of-explanation-kit.json`; read back by sha256 on 13 Nov 2026), the goodwill
  letter's optional blanks use the `?` form, and the bundle archive is uploaded (11 Nov 2026).

## Not done, and why

- Real Buy and Restore against a store, a Restore on a second phone, and the 100-Restore load
  check (`npm run bundle:load`): all need the store accounts.
- Store files (task 11): launch plan.
- A check on an iPhone that the web preview's phone storage opens in Safari: nobody has looked.

Next step: the coordinator lands PR #84. Nothing else is queued for Codex.
