# ApprovalPrep phone app plan

The plan, with a 390 × 844 mock of every screen, lives on one page:
**https://claude.ai/artifact/HGBdLax18m1a1tB62Khihh** (6 Nov 2026). This file is the part Codex
builds from. The page wins if the two ever differ.

- Brand: the approved design system, https://claude.ai/artifact/BKh2xEmgb1wAitJ9Tq9N4T (light only).
- Audience: https://claude.ai/artifact/JxZbRkaRbZfZrKEJpUMV6Y (people about to pay a monthly credit
  repair company; the letter of explanation comes second).
- Risk: R-ADV-13 in the risk brain. Every screen ends with the self-help line, word for word:
  "Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you."
  Never promise to raise a score, remove items, "fix" or "repair" credit, or act for the person.
  Guard: `apps/mobile/tests/self-help.test.ts`.

## What it is

A letter desk on the phone: draft a credit bureau dispute letter for free, save it as a PDF, mark it as
sent. The Credit Letter Kit, paid once in the app, adds goodwill, debt validation, pay for delete and
follow-up letters, and the tracking: mark as sent, the day count, the tracking number and a reminder on
day 30 when the bureau's answer is due (FTC). Free: the dispute letter, its PDF and the list of saved
letters (owner, 10 Nov 2026: "If the apps are sending reminders and all of that it should charge for
that stuff"). No account, no
upload, no analytics, no server, no AI call.

## Paid content is never in the public repo or the app bundle (10 Nov 2026; build it this way from the start)

This repo is public and anything inside an app bundle can be read out of it, so paid content ships
only after a confirmed purchase:
- **Bundled in the app (free):** the free dispute letter, the Letter Studio's situations and openers
  (from `src/data/letterStudio.ts`), the screens, and short fake fixtures for tests.
- **Delivered after purchase:** the 4 Credit Letter Kit templates, the 9 Letter of Explanation templates,
  the guides and the bundle's 50 documents. Their sources live outside the repo
  (`APPROVALPREP_KITS_DIR`, default `~/.boss-os/approvalprep/kits/`, uploaded to R2), never committed.
- **The door:** a Pages Function `/api/app-unlock` checks the purchase with RevenueCat's server API
  (secret on the server only) and returns short-lived signed links; the phone downloads once, keeps
  it, and works offline after. No RevenueCat secret yet = NAMED STOP [REVENUECAT_SECRET_MISSING]
  and Buy stays off. Restore re-runs the same door.
- Tests: a check fails if any paid template or guide text is in `apps/mobile` or the repo; the route
  refuses without a confirmed entitlement and answers the same for unknown and refused.
- Task 4 ports only the free dispute letter into the app; the kit templates are written to the
  private folder (tasks 8 and 13 read them through the door).

## Built for 100 paying customers a day (owner, 10 Nov 2026: "begin with the end in mind, build for 100 customers or more per day")

Design target: **100 purchases a day per app**, which at 3 to 6% of free users buying means about
**2,000 to 3,000 people a day** using the free part. Every task is built to that load at $0.
- **Everything is on the phone:** Studio, letters, PDF, tracking, reminders. No server, no AI, no limit.
- **Bundle downloads (task 13b):** served from R2 (no charge for downloads) behind the store's confirmed
  purchase; sized for 100 bundle buyers a day.
- **Purchases:** the stores and RevenueCat carry any volume; Restore must work with no support email.
- **Load check before the store step:** a script replays 100 bundle downloads and 100 Restores against a
  preview and fails on any error. Named stop on failure.

## Screens (route → plan id)

| Id | Screen | Route |
|---|---|---|
| S1 | Start | `app/index.tsx` |
| S2 | Write a letter (tab) | `app/(tabs)/letters/index.tsx` |
| S3 | Questions | `app/(tabs)/letters/[kind].tsx` |
| S4 | Your letter | `app/(tabs)/letters/draft.tsx` |
| S5 | Mark as sent (sheet, "✕ Close") | `app/(tabs)/letters/sent.tsx` |
| S6 | My letters (tab) | `app/(tabs)/mine/index.tsx` |
| S7 | Credit Letter Kit | `app/(tabs)/letters/unlock.tsx` |
| S8 | More (tab) | `app/(tabs)/more/index.tsx` |

Navigation (make-it-calm section 7): `src/screens.ts` is the one map. Each tab has its own
stack, so sub-screens and sheets keep the three tabs visible and tapping the current tab
returns to its root; headers name the screen and show "← Back" (sheets "✕ Close");
Android back and Escape go back the same way. `tests/nav.test.ts` checks every screen
reaches Write a letter in one tap, Back stays inside its tab, and nothing is orphaned.

## Seeing each build

`.github/workflows/app-preview.yml` builds a debug-signed Android APK on every change to
`apps/mobile` (pull requests and main) and puts it on Appetize with
`apps/mobile/scripts/preview/appetize.sh` (copied from seq23/keepmyproof). One stable link; it is
printed in the run summary. Pin it with the repo variable `APPROVALPREP_APPETIZE_PUBLIC_KEY`.
No `APPETIZE_API_TOKEN` secret → `NAMED STOP [APPETIZE_TOKEN_MISSING]` in the summary, the APK still
attached. Android rather than the iOS simulator: this repo's workflow contract
(`scripts/workflows/trace-all.mjs`) requires ubuntu-24.04 and Node 22.12.0 for every workflow.

The workflow never builds or deploys the website. Proof for the scaffold PR: `npm run build` on the
branch and on main gave the same 230 files, byte for byte, apart from the `generatedAt` stamps in
`citation-targets.json` and `content-index.json`, which differ between any two builds of main.

## Codex's task list (build in this order)

Run `npm run check` in `apps/mobile` after each task; the App preview run must stay green.

1. **Start from the scaffold.** Rebase the scaffold branch on main.
   Accept: `npm run check` green; App preview green with an Appetize link; all 8 screens reachable.
2. **Components** from `src/theme.ts` only: Screen, Button, Row (circle, title, sub line, one action),
   BottomSheet, Field with a labelled default, Sheet, Tag.
   Accept: a test finds no colour hex outside `theme.ts`; every Pressable is at least 48 high.
3. **On-phone storage** (expo-sqlite): letters with kind, answers, status, sent date, method,
   tracking number, reminder date, answer note.
   Accept: tests for create, update, delete, delete-all; data survives a restart; a test finds no
   network call in `src` outside the purchases module.
4. **Letters and questions.** Five templates ported from the Credit Letter Kit's own wording in this
   repo; 4 to 6 questions each, one per screen; [brackets] for blanks; answers save as they type.
   Accept: a rendered-letter test per kind; the R-ADV-13 test covers the templates; question
   screens show `HONEST_LIMIT`; pay for delete says "They may say no."
4b. **The free Letter Studio: the main free draw** (owner, 10 Nov 2026: yes to the website's free
   product as the app's main attraction, and "make sure the free offering isn't making it not worth
   buying anything"). The website's Studio on the phone: the same eight situations and openers from
   `src/data/letterStudio.ts` (import it, never copy), a few prompts, one **first-pass draft** as plain
   text to copy or share, and under it "What the kit adds ›" for that situation's kit.
   **The free line, so the kits stay worth buying:** the Studio gives the first pass only, as the
   website does: no situation-specific letter templates, no examples, no PDF letter sheet, no mark as
   sent, no tracking, no reminder; those are the kits'. The free dispute letter keeps its PDF (the FTC
   gives that letter away).
   Accept: the Studio's situations equal the website's list; a test fails if any free Studio output
   contains a sentence from a kit template; with no kit, a Studio draft offers copy and share only (no
   PDF, no mark as sent); each situation's "What the kit adds" names its kit.
5. **Your letter.** The sheet with the disputed line highlighted; Save as PDF (expo-print); Share or
   print (expo-sharing).
   Accept: a PDF is made and shared in the preview; its footer is the self-help line.
6. **Mark as sent and the reminder.** Today as the labelled default; method pull-down; optional
   tracking number; a local notification on day 30 (expo-notifications), permission asked here only.
   Needs the kit entitlement; without it the sheet shows the kit (S7) instead.
   Accept: a pure-function test (Fri 6 Nov → Sun 6 Dec) and for the day count; nothing scheduled
   without permission or without the kit; a new date reschedules.
7. **My letters.** Line 1 count ("3 letters · 1 answer to check"); one list; rows never move; gold
   after day 30; ✓ with a time when an answer is logged; an empty-state line.
   Accept: tests for the count and each row's sub line; no red on the list.
8. **The kit purchase.** react-native-purchases in KeepMyProof's provider shape: a mock provider in
   the preview (`REVENUECAT_KEY_MISSING` on Buy), one non-consumable product **`ap_credit_kit` at
   $19.99, paid once (approved 6 Nov 2026)**, the shown price read from the store, Restore purchase.
   **Switched OFF:** `KIT_SALES_ENABLED = false` in `apps/mobile/src/kit.ts`; Buy returns the named
   stop `STORE_ACCOUNTS_NOT_READY` until the company store accounts and RevenueCat exist (she signs
   up for those herself). Create nothing in RevenueCat or a store.
   Accept: `tests/kit.test.ts` (product id, price, switch off, named stop); kit letters open only
   with the entitlement; mark as sent, the day count and the reminder open only with it; the free
   letter, its PDF and the list of saved letters never lock; no price string outside the
   mock and `kit.ts`.
9. **More.** Links to /privacy/, /not-a-credit-repair-company/, /terms/, /refund-policy/, /contact/;
   "Delete all my letters" apart, asking once.
   Accept: every link answers 200; delete-all asks "Yes, delete" or "Keep" first.
10. **Preview sample letters.** With `EXPO_PUBLIC_AP_PREVIEW=1`, S1 offers "Preview only: load
    sample letters ›" (Appetize sessions last about 3 minutes).
    Accept: the button exists only with the flag; the release gate refuses a store build with it.
11. **Store files.** Finish `store/en.md`, `store/listing.json`, the privacy-label answers and the
    Google Play financial features answers.
    Accept: `tests/store.test.ts` and the self-help test stay green.
12. **Release gate** (copy KeepMyProof's `scripts/release-gate.mjs`): a production build stops while
    the bundle id is the placeholder, the preview flag is set or the purchases key is missing.
    Accept: a test per named stop. No agent runs a production build or submits.
13. **The Letter of Explanation Kit (second kit; owner, 10 Nov 2026).** The website's Letter of
    Explanation Kit as a second one-time in-app product, **`ap_explanation_kit` at $14.99, paid once**
    (the site sells it for $15; the store's nearest step). Its nine letters are ported from this
    repo's own wording (docs/offerings/letter-of-explanation__*.md): credit, income gap, employment
    gap, address history, rental issue, late payment, bank statement, life event, general
    application. Same question flow, PDF, My letters, mark as sent and reminder as the credit
    letters; a new "For a landlord, lender or employer" group on S2. Switched off with the same
    `KIT_SALES_ENABLED` / `STORE_ACCOUNTS_NOT_READY` stop; create nothing in a store.
    Accept: a rendered-letter test per kind; the R-ADV-13 and honest-limit tests cover the nine;
    the kits unlock independently (owning one never opens the other's letters); owning either kit
    opens tracking and the reminder; the free dispute letter never locks; Restore brings back both.
13b. **The Complete ApprovalPrep Bundle in the app** (owner, 10 Nov 2026: "offer the more expensive
    full bundle on app too"). **`ap_complete_bundle` at $49.99, paid once** (the website sells it for
    $49): both in-app kits (credit letters and explanation letters, with tracking and reminders) plus
    every website kit's PDF guide and editable DOCX templates (all 50 documents), downloaded from our
    server after the store confirms, restorable, like Dream Wedding's printables. **`ap_bundle_upgrade`
    at $29.99** for anyone who already owns a kit, so nobody pays twice ($19.99 + $29.99 = $49.98).
    Offers are one pure function `offersFor` (as Dream Wedding): owns nothing → the bundle first
    (better value), then the kit for the letter tapped; owns one kit → the other kit and the upgrade;
    owns both kits → the upgrade; owns the bundle → nothing. Same switch and named stop as task 8.
    Accept: `offersFor` tests for every case; bundle files download only after a confirmed purchase;
    Restore brings back the bundle and its files; no price string outside `kit.ts` and the mock.
14. **Scorecard row** in Boss OS (result, day-30 and day-60 floors, version B from the plan page)
    before the first store submission, carrying the price step (owner, 10 Nov 2026): at about 20
    real ratings `ap_credit_kit` goes from $19.99 to $24.99 by a store price change.

## Hostile review fixes (10 Nov 2026; these win over the plan page)

- **No other company's name or price inside the app** (S7 drew "Credit Saint, $79.99 to $139.99 a
  month"): a price in a shipped build goes stale and cannot be corrected without a new release, and a
  named competitor is a claim to defend. S7 says instead: "Credit repair companies usually charge
  every month. This kit is paid once." Guard: the self-help test also fails on a company name or a
  dollar amount other than the store's price in `src` copy.
- **No per-round pricing, ever** (owner, 10 Nov 2026): a new dispute round is the same job continuing,
  and charging by stage of someone's dispute is the shape the Credit Repair Organizations Act targets.
- **One purchase, every round:** the kit is bought once per person and covers every letter and every
  dispute round after it; Restore brings it back on a new phone. Test in `tests/kit.test.ts`.
- **Store category** (task 11, parked for the launch plan) is chosen for what the app is (Finance or
  Productivity), never to avoid a review lane; 5.1.1(ix) applies by content, not category.

## Her rulings

- **In-app Credit Letter Kit: $19.99, paid once. Approved 6 Nov 2026.** Product id `ap_credit_kit`.
- **Store accounts: the company accounts (Redwood Reserve Holdings LLC), after the D-U-N-S number.
  Approved 6 Nov 2026.** Why: Apple's guideline 5.1.1(ix) expects financial-field apps from a legal
  entity. The bundle id `com.approvalprep.app` stays a placeholder until then.
- She signs up for the store accounts and RevenueCat herself; until then sales stay off
  (`STORE_ACCOUNTS_NOT_READY`).
