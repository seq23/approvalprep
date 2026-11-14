# Before a store build

`npm run release:gate` reports every current stop. The production Expo config and
EAS pre-install hook enforce the same checks. Preview and development builds remain free
of store-account requirements. This task does not build or submit a store release.

- Replace both `com.approvalprep.app` placeholders with the company account identifiers.
- Set the public RevenueCat SDK keys `EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY` (`appl_`)
  and `EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY` (`goog_`) in the build environment.
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
- For the days of a store review only, set `APPROVALPREP_ACCEPT_SANDBOX_PURCHASES=1` so the
  reviewer's test purchase opens the kit; remove it afterwards.
- In RevenueCat, name each entitlement exactly as its product (`ap_credit_kit`,
  `ap_explanation_kit`, `ap_complete_bundle`, `ap_bundle_upgrade`), one product each.
- Run `npm run bundle:load` against a preview with a verified purchase identity, and restore
  once on a second phone, before the first submission.

Task 11: NAMED STOP [WAITS_FOR_LAUNCH_PLAN], as directed by the owner. No agent runs a
production build or submits.
