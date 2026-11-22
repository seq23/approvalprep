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

## Limits and store review (13 Nov 2026)

- Both doors need the `PRODUCTS_DB` binding for their attempt counters and answer 503
  (`APP_KIT_DELIVERY_NOT_READY`, `APP_BUNDLE_DELIVERY_NOT_READY`) without it. `/api/app-unlock`
  allows 10 attempts a minute per caller, `/api/app-bundle` 120 (room for the 100-Restore load
  check). Callers are counted by a hash, never a raw address.
- Sandbox purchases open nothing. Store reviewers and testers buy in the sandbox, so for the
  days of a store review set the server variable `APPROVALPREP_ACCEPT_SANDBOX_PURCHASES` to `1`
  and remove it afterwards. Refunded purchases stay refused either way.

## Single-kit files (13 Nov 2026)

Every in-app kit also opens the website kit's PDF guide and Word file through
`POST /api/app-files?kit=<sku>` and `GET /api/app-files-file` (functions/_runtime/app-files.js).
Same bindings as above (`PRODUCT_ASSETS_R2`, `APPROVALPREP_REVENUECAT_SECRET`,
`DOWNLOAD_SIGNING_SECRET`, `PRODUCTS_DB`; 30 attempts a minute per caller). It reads the objects the
website already serves, so nothing new is uploaded. A missing or empty object answers
`APP_FILES_ASSET_MISSING`. Plan: docs/APP_PLAN.md, "Exact mirror".

## Upgrade tiers (13 Nov 2026)

`POST /api/app-bundle` (and the file door) accept the bundle, kits that already add up to $49.99, or
kits plus an upgrade tier at least as high as those kits call for (`src/lib/appUpgrade.mjs`, shared
with the app). `ap_bundle_upgrade` alone, with no kit, no longer opens anything.

## Play review access (22 Nov 2026)

Google Play's reviewer cannot buy, and the app has no accounts, so every paid kit opens with ONE server-checked
10-digit code (design: `~/Work/google-play-2026-11-21/REVIEW-UNLOCK-DESIGN.md`, shared with DW, KMP and PBS).

- **Where**: More > "Have a review code?" (`apps/mobile/src/ReviewCode.tsx`), Android only, store account only,
  not for a bundle owner, and only while `GET /api/review` answers 200. iOS never shows it.
- **Server**: `functions/api/review/{index,unlock}.js` -> `functions/_runtime/review.js`. Window -> body/ID format
  -> try limits (5/min burst, 20/IP/day, 1,000/day; all before the compare) -> constant-time compare -> ID known to
  RevenueCat -> 2 new devices per IP a day -> 10 devices per code version (the 11th files an Open Loops row,
  `REVIEW_DEVICE_CAP`) -> RevenueCat v2 `grant_entitlement` of `ap_complete_bundle` until `min(now + 7 days,
  REVIEW_UNTIL)`. Any RevenueCat failure revokes the granted entitlement (never a purchase), frees the slot, 503.
- **Doors**: `app-unlock`, `app-bundle` and `app-files` check the real purchase first, unchanged; only when there is
  none do they accept `reviewGrantLive`: window open AND a `review_grant` row for this ID under the current code
  version, not expired, AND RevenueCat still lists the bundle entitlement active. Anything else, or D1/RevenueCat
  down, gets the same refusal as "no purchase". The app's `ownershipFrom` reads the same RevenueCat grant
  (`grantedBundle`), so the app and the doors agree.
- **Pages settings** (production): secrets `REVIEW_CODE_SECRET` (vault `AP_PLAY_REVIEW_CODE`), `REVIEW_HASH_SECRET`
  (vault `AP_REVIEW_HASH_SECRET`), `BOSS_OPEN_LOOPS_TOKEN`; `REVIEW_CODE_VERSION` (the window id, `v1`) and
  `REVIEW_UNTIL` (ISO date) are vars in `wrangler.toml` (production only). Missing or past = every review route
  404 and no RevenueCat call. Preview deployments have no `REVIEW_CODE_SECRET`, so they stay closed.
- **Tables**: the additive migration `0002_review` in `migrations/` (HMACs only; rows purged 7 days after expiry on
  each redeem). Pages does not apply migrations on deploy: apply it to the `approvalprep-products` D1 by hand once.
- **Rotate** only on a `REVIEW_DEVICE_CAP` row or a suspected leak: new vault code, new `REVIEW_CODE_SECRET` secret
  (`printf %s "$AP_PLAY_REVIEW_CODE" | npx wrangler pages secret put REVIEW_CODE_SECRET --project-name approvalprep` under
  `vault:run`), the next `REVIEW_CODE_VERSION` in `wrangler.toml` (a new version starts a fresh 10 slots), and she
  pastes the new code in Play Console.
- **Revoke one device by hand**: RevenueCat v2 `POST /customers/{id}/actions/revoke_granted_entitlement` only.
