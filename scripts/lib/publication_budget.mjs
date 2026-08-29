#!/usr/bin/env node
/**
 * Publication budget: the one number every publisher has to ask for.
 *
 * `data/cadence/policy.json` holds `new_pages_per_week`, and
 * `scripts/cadence_gate.cjs` is the only thing that enforces it: it counts the
 * URLs in the sitemap that are not in `data/cadence/known_urls.json` and exits
 * non-zero when that count is over the cap.
 *
 * Nothing that publishes ever read that number. Each generator carried its own
 * copy of "how many new URLs may appear today", and there were four of them:
 *
 *   - data/strategy/content_release_cadence.json  cadence.dailyShortAnswers.targetPerDay = 3
 *   - data/authority_scale/velocity_governor.json current_default_new_page_ceiling_per_day = 3
 *   - data/authority_scale/velocity_decision.json recommended_new_url_ceiling_per_day = 3
 *   - data/content/page_opportunities.json        dailyPublishCap = 3
 *
 * Four registries of the same quantity, none of them linked to the one the gate
 * actually applies, and every one of them larger than it. While the page factory
 * was starved of demand-backed candidates it published 0 pages on 49 of 52 runs,
 * so the mismatch never showed. The moment the factory was given measured demand
 * the generators started emitting 3-4 new URLs a day against a cap of 2, the
 * gate blocked, and because the ledger is only advanced by the `--accept` step
 * that runs *after* a clear gate, the block could never clear itself: every
 * subsequent day compared a growing sitemap against a frozen baseline.
 *
 * So this is not another ceiling. It is the arithmetic remainder of the one
 * ceiling that is enforced:
 *
 *     remaining = new_pages_per_week - (URLs already new since the accepted baseline)
 *
 * A publisher that clamps its own limit to this cannot emit a URL set the gate
 * will refuse, which is the only property that matters. The generators keep
 * their own ceilings - those are risk tiers and they may legitimately be lower -
 * this is a floor under them, never a licence to publish more.
 *
 * The prospective URL set is computed from the same three registries
 * `scripts/seo/generate-sitemap.mjs` reads, not from `public/sitemap.xml`, so a
 * publisher asking mid-run sees the pages an earlier step in the same run just
 * wrote. `content:generate` and `content:generate-pages` run back to back inside
 * `citation-os:daily`; reading the on-disk sitemap would let the second one
 * spend the budget the first one had already spent.
 *
 * Section indexes are excluded on the same rule the gate uses, from the same
 * registries, for the same reason: a regenerated navigation index introduces no
 * subject matter and consumes none of the refresh capacity the cap protects.
 */
import fs from "node:fs";
import { createRequire } from "node:module";

// The gate is CommonJS, so the rolling-window arithmetic lives in a .cjs file and
// is reached from here through createRequire. One implementation, two callers: if
// the gate and this budget each carried their own idea of how much of the week is
// left, that is the same "four registries of one quantity" defect this module was
// written to end, reappearing one level up.
const cadenceWindow = createRequire(import.meta.url)("./cadence_window.cjs");

const SITE_ORIGIN = "https://approvalprep.com";

const readJson = (path, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};

// Same canonical form as scripts/seo/generate-sitemap.mjs. If that changes, this
// has to change with it or the two will disagree about what a URL is.
const canonicalUrl = (input) => {
  const url = new URL(String(input || "/"), SITE_ORIGIN);
  return `${SITE_ORIGIN}${url.pathname.replace(/\/+$/, "")}/${url.search}${url.hash}`;
};

const slugify = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

/** The URL set `seo:sitemap` would emit against the registries as they stand now. */
export function prospectiveUrls() {
  const urls = new Set();
  const manifest = readJson("data/routes/route_manifest.json", { routes: [] });
  const generated = readJson("data/content/generated_answers.json", { answers: [] });
  const reports = readJson("data/reports/public_report_registry.json", { reports: [] });
  for (const route of (manifest.routes || []).filter((r) => r && r.index && r.type !== "admin")) {
    urls.add(canonicalUrl(route.path));
  }
  for (const answer of (generated.answers || []).filter((a) => a && a.status === "published_by_contract")) {
    urls.add(canonicalUrl(`/blog/${slugify(answer.title)}`));
  }
  for (const report of (reports.reports || []).filter((r) => r && r.status === "published_by_contract")) {
    urls.add(canonicalUrl(report.path));
  }
  return urls;
}

const normalisePath = (value) =>
  String(value || "").replace(/\/index\.html$/, "").replace(/\/+$/, "") || "/";

/** The section-index exemption, read from the same registries as the gate. */
export function sectionIndexPaths() {
  const out = new Set();
  for (const route of readJson("data/cadence/section_indexes.json", { routes: [] }).routes || []) {
    out.add(normalisePath(route));
  }
  for (const route of readJson("data/routes/route_manifest.json", { routes: [] }).routes || []) {
    if (route && route.page_intent === "section_index") out.add(normalisePath(route.path));
  }
  return out;
}

/**
 * How many new indexable URLs may still be published before
 * `npm run cadence:gate` would block.
 *
 * `remaining` is null - meaning "the gate cannot block, so this imposes no
 * constraint" - when there is no accepted baseline to measure against, which is
 * exactly the condition under which the gate skips its cap check.
 */
export function publicationBudget() {
  const policy = readJson("data/cadence/policy.json", {}) || {};
  const parsed = Number(policy.new_pages_per_week);
  const cap = Number.isFinite(parsed) ? parsed : 2;

  const ledger = readJson("data/cadence/known_urls.json", null);
  if (!ledger || !Array.isArray(ledger.urls)) {
    return { cap, ledgerExists: false, alreadyNew: 0, remaining: null };
  }

  const known = new Set(ledger.urls);
  const sectionIndexes = sectionIndexPaths();
  const isSectionIndex = (url) => {
    try {
      return sectionIndexes.has(normalisePath(new URL(url).pathname));
    } catch {
      return false;
    }
  };
  const alreadyNew = [...prospectiveUrls()].filter((url) => !known.has(url) && !isSectionIndex(url)).length;

  // The remainder is the declared rate minus what the trailing window already
  // holds minus what is new-but-unaccepted right now. Subtracting only the
  // latter treated every daily --accept as the start of a fresh week.
  const today = process.env.CADENCE_TODAY || new Date().toISOString().slice(0, 10);
  const allowance = cadenceWindow.remainingAllowance({ cap, ledger, today, policy, alreadyNew });
  return {
    cap,
    ledgerExists: true,
    alreadyNew,
    windowDays: allowance.windowDays,
    spentInWindow: allowance.spentInWindow,
    remaining: allowance.remaining,
  };
}

/** Clamp a generator's own ceiling to what the enforced cap will actually accept. */
export function clampToPublicationBudget(ownLimit, label) {
  const budget = publicationBudget();
  const limit = Math.max(0, Number.isFinite(Number(ownLimit)) ? Number(ownLimit) : 0);
  if (budget.remaining === null) return { limit, budget };
  const clamped = Math.min(limit, budget.remaining);
  if (clamped < limit) {
    console.log(
      `[${label}] publication budget: cadence policy allows ${budget.cap} new URL(s) per accepted baseline, ` +
      `${budget.alreadyNew} already new since data/cadence/known_urls.json, so this run may publish ${clamped} ` +
      `rather than its own ceiling of ${limit}.`,
    );
  }
  return { limit: clamped, budget };
}
