# Pinterest pins: format, gate and the approval hold

How approvalprep.com pins are made, what stops a bad one, and the one command that releases
the redrawn pins once Sequoia approves them.

## What a pin looks like (since 6 Nov 2026)

- The pin shows the useful thing itself: the opening of a sample letter, or 5 to 8 checklist
  lines in large type, on a cream paper look with carbon text and its board's one accent colour
  (`data/pinterest/boards.json` `accent`). Drawn by `scripts/pinterest/paper_layouts.mjs` with the
  bundled OFL fonts in `scripts/pinterest/fonts/`, so it renders the same everywhere.
- Copy per page: `scripts/pinterest/pin_copy.mjs` (searched phrases, headlines, titles, letters,
  checklist). Pins are built by `scripts/pinterest/variants.mjs` `buildPaperVariant`.
- A photo layout (`photo-band`) exists but no photo is in use: the approved brand says no stock
  photos. A photo may only be added to `data/pinterest/photos.json` with a free licence
  (Unsplash free licence, never Unsplash+, Pexels or Pixabay), photographer, link, licence,
  `watermark: false`, and at least 1000 px wide.
- Pins released before 6 Nov keep their old product-box images (`scripts/build_pin_images.mjs`
  legacy layouts). Posted pins are never changed.

## The gate (every refill, every pull request)

`scripts/pinterest/quality.mjs` `pinIssue`, run by `npm run pinterest:refill` before it writes
and by `npm run validate:pinterest-drip` on every pull request. A new pin is refused when it:

- shows the product box (a legacy layout);
- has a sales word or price anywhere: self-service, instant download, one download, kit,
  bundle, truthful, downloadable, `$`;
- has a title with a `| Kit name` ending, a `Save this:` / `Read this first:` opener, or one
  that does not start with a searched phrase;
- links to a kit page without naming a template, or promises a guide and opens a kit page;
- uses a colour other than its board's accent, or text that is cut off or unreadable at 236 px.

The scheduler (`src/lib/pinfeed-core.mjs` `scheduleVariants`) never puts more than 2 pins of
one page in any 7 days. A day where every remaining page is blocked stays empty.

## The approval hold

While `config.APPROVAL.state` in `data/pinterest/queue.json` is `"held"`:

- every unreleased pin sits in `queue.held` with no release date; no feed shows it;
- the daily refill redraws and gates them, holds new question pins too, and adds no batch;
- the refill log prints `HELD_FOR_APPROVAL` with the count.

Sample page for her look: the link in `config.APPROVAL.sample`.

### Release after her yes (one command)

```sh
gh workflow run pinterest-refill.yml -R seq23/approvalprep -f release_held=true
```

The Pinterest Refill workflow runs `npm run pinterest:release-held`: it dates every held pin
from tomorrow (America/Chicago) at `PINS_PER_DAY` with the spread rule, re-runs the gate, ends
the hold, builds, validates and pushes the queue to `main`. The first released pins appear in
the feeds at midnight Central. It stops with `NOTHING_HELD` if there is nothing to release.
