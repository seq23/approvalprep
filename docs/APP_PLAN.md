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
sent. The Credit Letter Kit, paid once in the app, adds goodwill, debt validation, settlement terms in
writing and follow-up letters, and the tracking: mark as sent, the day count, the tracking number and a reminder on
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
1a. **A preview link she can open (coordinator, 10 Nov 2026; do this before task 2).** The owner
   sees every build from a link, never a download. The preview job publishes the web export to
   Cloudflare Pages (project `approvalprep-app-preview`, created by the job if missing; repo secrets
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` already exist; free plan only) with
   `npx wrangler pages deploy <export dir> --project-name approvalprep-app-preview --branch <pr branch>`
   and prints the URL as the first line of the run summary and as a PR comment. The page carries
   `noindex`. No token or a refused deploy: NAMED STOP [PREVIEW_HOST_FAILED], and the job fails.
   Accept: the workflow fails when the deploy step prints no URL.
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
   screens show `HONEST_LIMIT`; the settlement-terms letter says "They may say no." (The old payment-for-removal phrase is retired on the site and in the kits, 10 Nov 2026: never use it in any spelling.)
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

## Day 30 is her step, never a paid round (owner + coordinator, 10 Nov 2026; these win over the plan page)

- **The day count and the day-30 reminder stay inside the ONE-TIME kit entitlement**, as already ruled.
  The app never sells a "round", a "follow-up" or a "next letter", never renews, stores no card and
  has no auto-renewing product of any kind.
- **The day-30 screen for someone who has not bought** shows the free information (what corrected /
  verified / no answer mean and what she can do herself for free, same content as the website's
  /the-bureau-answered/ page, with the off-ramp: accurate information stays on a report and a
  verified accurate item is not something to dispute again) and offers the SAME single kit
  (`ap_credit_kit`), once. A buyer who comes back is never shown a checkout for the credit path.
- **The $14.99 Letter of Explanation Kit is a different situation's kit**, never a repeat or a
  second stage of the credit path. It is not offered on the day-30 screen.
- **Day 30 is a date the app shows**, worked out on the phone from the mailed date (the website
  prints the same date and offers a calendar file). The free tier keeps the date on the saved
  letter; the reminder that fires on that date is the paid part.
- **Words that never appear:** "round 2", "next round", "keep disputing", "until it is removed",
  "we follow up", "subscription". The app never mails, contacts a bureau, reads her report or tracks
  her dispute on a server.
- **Import, never copy:** the letters, the bureau mail addresses (each with a dated source), the
  30-day window text and its sources, `answerDueDate`, the calendar-file builder and "what the kit
  adds" all live in `src/lib/letterStudioCore.mjs` and `src/lib/kitMoments.mjs` (re-exported by
  `src/data/letterStudio.ts`). Task 4b's "eight situations and openers" is now nine situations and
  `buildLetter()`; the free dispute letter is the `credit-dispute` situation.
  Accept: a test fails if the day-30 screen exposes a second product or a recurring price; the
  self-help wording test also covers the day-30 screen.

## Her rulings

- **In-app Credit Letter Kit: $19.99, paid once. Approved 6 Nov 2026.** Product id `ap_credit_kit`.
- **Store accounts: the company accounts (Redwood Reserve Holdings LLC), after the D-U-N-S number.
  Approved 6 Nov 2026.** Why: Apple's guideline 5.1.1(ix) expects financial-field apps from a legal
  entity. The bundle id `com.approvalprep.app` stays a placeholder until then.
- She signs up for the store accounts and RevenueCat herself; until then sales stay off
  (`STORE_ACCOUNTS_NOT_READY`).

## Screen patterns (shipped examples first; owner, 10 Nov 2026)

These notes come from real shipped screens looked at on 10 Nov 2026 (free, no-account sources; nothing copied). They are evidence, not test results. **Where a note disagrees with a rule, a test or a ruling elsewhere in this plan (for example "rows never move", the offers order in `offersFor`, the two locked tasks per window, or any money or claims rule), the plan wins and the note is ignored on that point.** Colours, type and words come from `src/theme.ts` and this plan.

# ApprovalPrep: screen patterns from shipped apps

Read this first:
- These are notes on shipped screens seen on 10 Nov 2026. They are not test results. Nobody measured which layout sells more.
- SEEN = I looked at the screenshot. TEXT ONLY = I read a description and did not see it.
- Sources: Adapty paywall library (a paywall capture per app) and App Store web pages (store screenshots, which are marketing frames around real screens).
- Structure only. No competitor words, colours or art are to be reused.
- Several credit apps seen promise score gains or removals in their store art. That is their choice and is NOT a pattern to follow: ApprovalPrep sells self-help templates, promises no outcome and never acts for the buyer.


### (g) One-time kit purchase screen (one kit, then a second kit and a bundle)

Examples looked at:
- FormalWriter (letter templates): https://apps.apple.com/us/app/id6761338077 : one-time ($4.99, after 2 free letters), one offer. SEEN (small)
- Structured, "lifetime only" variant: https://adapty.io/paywall-library/structured/ : one-time, one offer. SEEN
- Subscription Manager: https://adapty.io/paywall-library/subscription-manager/ : one-time, two price tiers side by side. SEEN
- Bills Organizer & Reminder: https://adapty.io/paywall-library/bills-organizer-reminder/ : two separate one-time unlocks, each with its own buy button and price. SEEN
- Baby Checklist: https://adapty.io/paywall-library/baby-checklist-shopping-list/ : one-time content pack (extra lists), sold from the locked rows in the list itself. SEEN
- Packing List Checklist: https://adapty.io/paywall-library/packing-list-checklist/ : one-time, one offer. SEEN
- Contrast, subscriptions: My Bill of Sale https://adapty.io/paywall-library/my-bill-of-sale/ (monthly, with a long renewal paragraph); PDF Expert https://adapty.io/paywall-library/pdf-expert/ (yearly with trial); Genius Scan https://adapty.io/paywall-library/scanner-app-genius-scan/ (yearly with trial). SEEN
- Price lists only: EasyLetter sells one lifetime pass https://apps.apple.com/us/app/id1495179755 ; Credit Dispute Tracker lists "Credit Pro" at $39.99 and $4.99 https://apps.apple.com/us/app/id6779428195 . TEXT ONLY for their purchase screens.

What they share:
- The one-time screens are short: a title, a list of what is inside (4 to 7 short rows), the price, one button, a restore link. They fit on one screen.
- "Paid once" is said in plain words next to the price or in the title, not in small print.
- The price is inside or directly above the main button. The button is the last big thing on the screen.
- A close or cancel control is visible in a top corner from the first moment.
- When two things are for sale, each is its own row or card with its own name, one line of what it is, and its own price. No toggle, no table.
- Content packs are sold where the content sits: a lock on the item, then a small confirm step that names what you get (Baby Checklist).

Build it like this:
- Top bar: visible close. Title: the kit's name. One line under it: paid once, not a subscription, templates you fill in and send yourself.
- "What is in this kit": 4 to 6 rows, each a named letter or sheet. Names of things, not benefits.
- One line stating the limit plainly: self-help templates, no promised result, we do not send or act for you. Normal text size, above the button.
- Main button: one, full width, with the price in it (kind: "Get this kit, $X once").
- Under the button, a quiet section "Other options": the second kit as one row (name, one line, price), then the bundle as one row (name, what it includes, price). Each row opens its own copy of this screen or selects in place; only one main button on screen at a time.
- Last: "Restore purchase" text link, terms, privacy.
- Leave out: trial wording, monthly prices, reviews, score numbers, before-and-after figures, a comparison table, a "most popular" badge on more than one item.

Do not:
- Do not use timers, "was" prices that were never charged, or limited-stock wording.
- Do not show score gains, removal counts or any result claim near the price.
- Do not pre-select the bundle when the person arrived from one kit's lock; show the kit they asked for first.

Honest limits: 6 one-time screens seen, but only 2 show two one-time items on one screen. No shipped screen was found with exactly "one kit, then a second kit and a bundle"; that order is assembled from the parts above. FormalWriter is the only letter app whose pay-once screen was seen, and only at small size.

### (e) Start screen

Examples looked at:
- Credit Dispute Tracker ("Your file" home): https://apps.apple.com/us/app/id6779428195 : price list shows "Credit Pro" $39.99 and $4.99; type not confirmed. SEEN
- FormalWriter (opens on the letter chooser): https://apps.apple.com/us/app/id6761338077 : one-time. SEEN
- Credit Repair Letters (opens on a numbered letter list): https://apps.apple.com/us/app/id1237780957 : free, no in-app purchases listed. SEEN
- Rocket Lawyer (dashboard is a list of your documents with status): https://apps.apple.com/us/app/id605512447 : SUBSCRIPTION. SEEN
- EasyLetter (latest letters list, one compose control): https://apps.apple.com/us/app/id1495179755 : one-time lifetime pass. SEEN
- Contract Maker (opens on "new draft"): https://apps.apple.com/us/app/id6446145749 : SUBSCRIPTION. SEEN

What they share:
- The first screen is the work itself: either "pick what to write" or "your documents". None of the six opens on a feature tour.
- One main action, to start a new document. It is a single button or the list itself.
- If the person already has documents, they show on the first screen as a short list with a status word and a date.
- One app leads with the next date that matters (Credit Dispute Tracker: a "next date" card above the list).
- No sign-in frame is shown first in any of the six store pages.

Build it like this:
- Top: app name and one plain line saying what it does (letters you fill in and send yourself).
- Main button, large, upper half of the screen (kind: "Write a letter").
- Under it one line: the first bureau dispute letter is free, as a PDF.
- If letters exist: a "next date" card (the nearest answer-due date and which letter), then the 3 most recent letters with status, and a link to all of them.
- If no letters exist: nothing else. No empty list, no sample data.
- Small text links at the bottom: how it works, kits.
- Leave out: sign-in, email capture, score meter, credit report import, chat, news or tips feed, a paywall on open.

Do not:
- Do not open on a paywall or a multi-page tour.
- Do not show a credit score, a gauge or a points figure anywhere on this screen.

Honest limits: 6 seen, all from store screenshots, which show a filled, best-case state. The true first-launch empty state was not seen for any of them.

### (f) "Write a letter" chooser (pick one of several letter situations)

Examples looked at:
- FormalWriter: https://apps.apple.com/us/app/id6761338077 : one-time. SEEN
- Credit Repair Letters: https://apps.apple.com/us/app/id1237780957 : free. SEEN
- Contract Maker (template type list): https://apps.apple.com/us/app/id6446145749 : SUBSCRIPTION. SEEN
- Baby Checklist (list with locked rows): https://adapty.io/paywall-library/baby-checklist-shopping-list/ : one-time pack. SEEN (a chooser with locks, not letters)
- Rocket Lawyer (one question per screen once a document is picked): https://apps.apple.com/us/app/id605512447 : SUBSCRIPTION. SEEN (the step after the chooser)

What they share:
- A plain vertical list. One row per situation. No grid of tiles, no carousel.
- The screen title is a question or an instruction to choose.
- Each row is the situation in the user's words, with one small line under it saying what the letter asks for.
- Short lists show everything at once (Credit Repair Letters: about a dozen rows). Long lists add a search box, a short "popular" group at the top, then categories (FormalWriter).
- Tapping a row goes straight to filling it in. No confirm step.
- Paid rows stay in the list with a small lock; free rows have no mark.

Build it like this:
- Title: a question (kind: "What do you need to write?").
- First group, "Free": the bureau dispute letter as the first row, marked free.
- Then the other situations as rows, grouped under 2 or 3 plain headers at most. Each row: situation name, one small line, and a small lock if it belongs to a kit.
- Keep it to one screen of rows if possible (about 6 to 10). Add search only if the list passes about 15.
- Tap a free row: go to the form. Tap a locked row: open that kit's purchase screen, showing that letter first in "what is in this kit".
- One small line at the bottom: these are templates; you send them yourself.
- Leave out: icons per row that carry no meaning, numbering, prices on every row, descriptions longer than one line.

Do not:
- Do not hide which rows are paid until after the form is filled in.
- Do not order rows to push the paid ones above the free letter.

Honest limits: 3 true letter or document choosers seen (FormalWriter, Credit Repair Letters, Contract Maker); the other 2 are related screens. That is the minimum asked for, not more.

### (h) "My letters" list with status (draft, sent, answer due in N days)

Examples looked at:
- Credit Dispute Tracker (dispute detail and result screens): https://apps.apple.com/us/app/id6779428195 : type not confirmed. SEEN
- Rocket Lawyer (documents list with a status word per row): https://apps.apple.com/us/app/id605512447 : SUBSCRIPTION. SEEN
- Invoice Simple (list with due dates, overdue marked): https://apps.apple.com/us/app/id694831622 : SUBSCRIPTION. SEEN
- EasyLetter (latest letters list): https://apps.apple.com/us/app/id1495179755 : one-time. SEEN
- Chronicle (bills grouped "due soon" / "due later", days left on each row): https://apps.apple.com/us/app/id572561420 : mixed. SEEN
- Bills Manager (groups: past due, due within 7 days, due within 30 days, paid): https://apps.apple.com/us/app/id834370671 : one-time. SEEN

What they share:
- One row per document: name on the first line, a status word and a date on the second line. The status word is coloured; nothing else on the row is.
- Three or four statuses at most, in plain words (incomplete, complete, sent, answered; due, overdue, paid).
- Rows with a deadline show the date or the days left on the right side, and late ones are the only rows in a warning colour.
- Lists with deadlines are grouped by urgency (overdue, soon, later, done), not by the date the item was created.
- The dated detail screen counts from the day the letter was received, and shows the mailed date, delivered date and due date together (Credit Dispute Tracker). The result is recorded as one choice from a short fixed list.
- One "+" or compose control to start a new one.

Build it like this:
- Title: "My letters". One "+" control in the top corner.
- Groups in this order, each shown only when it has rows: Answer overdue, Waiting for an answer, Drafts, Answered.
- Row: who the letter is to and what it is about on line one. Line two: a status word (Draft, Sent, Answered) and the date it happened. Right side, for sent letters only: "answer due in N days" or "N days overdue".
- Tap a draft: continue it. Tap a sent letter: a detail screen with date mailed, date delivered (the person enters these), the due date worked out from them, the PDF, and one control to record the answer.
- Recording the answer: pick one from a short fixed list and a date. The row moves to Answered and stays.
- The due date is a count of days only. Say next to it that it is a reminder based on the dates entered.
- Leave out: progress rings, score changes, success rates, charts, swipe-only actions with no visible button.

Do not:
- Do not label any status with a result the app cannot know (such as "removed" or "fixed") unless the person recorded it.
- Do not mark a letter Sent automatically; the person mails it and says so.
- Do not hide answered letters or drafts.

Honest limits: 6 seen. Only 1 (Credit Dispute Tracker) is a letter tracker with an answer deadline, and I saw its detail screens, not its list. The list layout above leans on the document, invoice and bill lists.
