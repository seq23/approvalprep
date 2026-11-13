# Complete Bundle delivery

Task 13b adds `ap_complete_bundle` and `ap_bundle_upgrade`. Sales use the same
`KIT_SALES_ENABLED = false` / `STORE_ACCOUNTS_NOT_READY` gate as the kits. No store
product or RevenueCat configuration is created by this change.

The Complete Bundle screen is reached from More. Its offers are computed by
`offersFor`: no ownership gets the bundle and the requested kit; one kit gets the
other kit and the upgrade; both kits get the upgrade; bundle ownership gets none.
Prices displayed in the phone app come from the store, with labelled preview-only
prices in the mock. The upgrade is checked against current store ownership before
opening the store purchase UI.

## Private assets and owner setup

`POST /api/app-bundle` checks the anonymous store identity with RevenueCat and
requires a live, non-refunded, non-expiring bundle or upgrade purchase. A single
kit, sandbox purchase, unknown identity or upstream refusal never opens the files.
The response contains both private kit JSON files and a five-minute signed ZIP URL.
The ZIP route has its own signature domain and streams the fixed R2 object; no
request chooses an arbitrary R2 path. Both responses are private and no-store.

Required existing bindings/secrets: `PRODUCT_ASSETS_R2`,
`APPROVALPREP_REVENUECAT_SECRET`, `DOWNLOAD_SIGNING_SECRET`.
Required private objects:

- `app-kits/credit-letter-kit.json`: the four credit kit templates.
- `app-kits/letter-of-explanation-kit.json`: the nine explanation templates.
- `app-kits/complete-approvalprep-bundle.zip`: PDF guides and editable DOCX
  templates from the website kits. The object must exist and have a positive byte
  size; no custom metadata or document count is required. A missing or empty
  archive returns `APP_BUNDLE_ASSET_MISSING`.

Paid sources stay in `APPROVALPREP_KITS_DIR` (default
`~/.boss-os/approvalprep/kits/`), never in the public repo or phone bundle.
The coordinator confirmed the private archive upload on 11 Nov 2026. Store
products, company accounts, RevenueCat entitlements and the server secret remain
owner-held setup.

On the phone, Restore downloads the ZIP before installing either kit. All three
local records commit together in the existing `approvalprep-kit.db`; a failed
Restore leaves previously installed content available. The ZIP stays in the app's
document directory and can be exported using the system share sheet. Repeated
Restore replaces the local archive. Web preview cannot make purchases or install
native files.

## Integration and verification

This branch starts from the scaffold, independently of held PRs #124 and #128.
Its kit table keys and payloads match those PRs. Those PRs supply the kit checkout,
explanation forms and normal kit Restore; #127 supplies sent details and reminders.
Merge those held tasks before evaluating the entire paid bundle flow. The free
dispute letter and its PDF keep their existing paths.

`npm run check` runs the offer, entitlement, private-delivery and signed-download
regressions with fake content only. Real-device store purchase/Restore and private
archive inspection require the owner setup above; a production build is not run.
Before store submission, `npm run bundle:load` replays 100 verified bundle Restores
and 100 ZIP downloads against `AP_BUNDLE_LOAD_ORIGIN` using an already purchased
anonymous identity in `AP_BUNDLE_LOAD_TOKEN`. Missing inputs stop visibly. Inject
that token through the vault; never put it in a command line or the repo.
