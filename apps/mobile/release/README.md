# Before a store build

`npm run release:gate` reports every current stop. The production Expo config and
EAS pre-install hook enforce the same checks. Preview and development builds remain free
of store-account requirements. This task does not build or submit a store release.

- Bundle id `com.approvalprep.app` is registered (App Store Connect app 6834891489); the gate stops only a missing or example id.
- Set the public RevenueCat SDK keys `EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY` (`appl_`)
  and `EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY` (`goog_`) in the build environment (EAS project env, `production`).
  Never set a RevenueCat server secret in an app environment.
- Remove `EXPO_PUBLIC_AP_PREVIEW=1` from production.

- Scorecard (plan task 14): the Boss OS row is `ap-phone-app` (seq23/boss-os#388). It was merged
  on 13 Nov 2026 and the date is in `release/scorecard.json`; the gate reports
  `NAMED STOP [SCORECARD_NOT_REGISTERED]` only if that date goes missing. The row carries the price step: `ap_credit_kit`
  from $19.99 to $24.99 at about 20 real ratings, by a store price change only.
- After launch, fill `release/store-metrics.json` weekly (counts only: launch date, installs,
  kit purchases). The scorecard reads that file; an empty or old count is "no number".

Server side, before sales are switched on (`KIT_SALES_ENABLED` in `src/kit.ts`):

- Set the server secret `APPROVALPREP_REVENUECAT_SECRET` on the website's Pages project. Without
  it the doors answer `NAMED STOP [REVENUECAT_SECRET_MISSING]` and no paid file leaves.
  It is the ApprovalPrep project's RevenueCat **v2** secret key (vault `REVENUECAT_AP_V2_SECRET_KEY`): the doors read
  `/v2/projects/{project}/customers/{id}/purchases` and `/products` (`functions/_runtime/revenuecat.js`). A key
  RevenueCat refuses answers `NAMED STOP [REVENUECAT_KEY_REJECTED]`.
- Put both kit files in the private bucket (`docs/APP_BUNDLE_DELIVERY.md`).
- For a store review, set `APPROVALPREP_ACCEPT_SANDBOX_PURCHASES=1` so the reviewer's test purchase
  opens the kit. It counts only while `REVIEW_UNTIL` (wrangler.toml, at most 30 days ahead) is open, so
  reopen that window for each submission (`docs/APP_BUNDLE_DELIVERY.md`, "Play review access").
- In RevenueCat, name each entitlement exactly as its product (`ap_credit_kit`,
  `ap_explanation_kit`, `ap_complete_bundle`, `ap_bundle_upgrade`), one product each.
- Run `npm run bundle:load` against a preview with a verified purchase identity, and restore
  once on a second phone, before the first submission.

Task 11: production builds go to TestFlight (`eas build -p ios --profile production --auto-submit`,
submit profile `production`, ascAppId 6834891489). Submitting for App Store review stays with the owner.
- `NAMED STOP [KIT_SALES_OFF]`: a store build with `KIT_SALES_ENABLED` not `true` in `src/kit.ts` is refused
  (Apple rejects prices that cannot be paid, guideline 2.1).

Google Play: the `internal` build profile (extends `production`, same full gate, RevenueCat `goog_` key from the EAS
`production` environment) is built and uploaded by `.github/workflows/android-store-build.yml` (manual dispatch only):
`eas build --local` on a GitHub runner with the EAS-held upload key (SHA-1 checked against the 19 Nov 2026 AAB), then
`eas submit --profile internal` to the internal testing track as a **draft**, then `scripts/play-internal-check.mjs`
fails the run unless Play shows that versionCode as a draft on internal and on no other track. `play-sa.json` is written
from the `GOOGLE_PLAY_UPLOAD_SA_JSON` secret and deleted in an `always()` step. Production on Play is a later, separate step.

App Store files (27 Nov 2026): `store/app-review-notes.txt` is the App Review Information > Notes text
(`tests/appReviewNotes.test.ts`: at most 4,000 characters, every quoted label is on a screen). `store/app-store/` holds the
three 6.9-inch screenshots (1320 x 2868), remade from the live app preview with
`node scripts/app-store-shots-capture.mjs https://approvalprep-app-preview.pages.dev <dir>` then
`node scripts/app-store-shots-compose.mjs <dir> store/app-store` (needs playwright and Chrome). Remake them whenever a
pictured screen changes; `tests/store.test.ts` checks their size.
