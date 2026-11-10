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
sent, and get a reminder on day 30 when the bureau's answer is due (FTC). The Credit Letter Kit, paid
once in the app, adds goodwill, debt validation, pay for delete and follow-up letters. No account, no
upload, no analytics, no server, no AI call.

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
5. **Your letter.** The sheet with the disputed line highlighted; Save as PDF (expo-print); Share or
   print (expo-sharing).
   Accept: a PDF is made and shared in the preview; its footer is the self-help line.
6. **Mark as sent and the reminder.** Today as the labelled default; method pull-down; optional
   tracking number; a local notification on day 30 (expo-notifications), permission asked here only.
   Accept: a pure-function test (Fri 6 Nov → Sun 6 Dec) and for the day count; nothing scheduled
   without permission; a new date reschedules.
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
   with the entitlement; the free letter and My letters never lock; no price string outside the
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

## Hostile review fixes (10 Nov 2026)

- **No other company's name or price inside the app** (S7 drew "Credit Saint, $79.99 to $139.99 a
  month"): a price in a shipped build goes stale and cannot be corrected without a new release, and a
  named competitor is a claim to defend. S7 says instead: "Credit repair companies usually charge
  every month. This kit is paid once." Guard: the self-help test also fails on a company name or a
  dollar amount other than the store's price in `src` copy.
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
